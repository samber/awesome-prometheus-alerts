// Package share stores rule files shared with `npx awesome-prometheus-alerts share`.
//
// Each accepted upload is written under `<YYYY-MM-DD>/<hostname>/<HHMMSS.mmm>Z/`
// (UTC): the shared files keep their relative paths, and a manifest.json
// describing the upload is written last. A folder without manifest.json is an
// interrupted upload and must be ignored by downstream processing.
package share

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"log/slog"
	"path"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/samber/oops"
	"golang.org/x/sync/errgroup"

	"github.com/samber/awesome-prometheus-alerts/server/internal/rules"
)

const (
	// ManifestName is the object written last in every upload folder.
	ManifestName = "manifest.json"
	// ManifestSchemaVersion is bumped on any breaking change to Manifest.
	ManifestSchemaVersion = 1

	maxClientFieldLength = 64
	uploadConcurrency    = 8
	yamlContentType      = "application/yaml"
	jsonContentType      = "application/json"
)

var (
	// ErrInvalidRequest is returned when the request itself is malformed.
	ErrInvalidRequest = errors.New("invalid share request")
	// ErrNoValidFiles is returned when every file was rejected.
	ErrNoValidFiles = errors.New("no valid rule file")
)

// ObjectStore persists objects. It is implemented by storage.S3Store.
type ObjectStore interface {
	Put(ctx context.Context, key string, body []byte, contentType string) error
}

// RuleValidator checks a rule file. It is implemented by rules.Validator.
type RuleValidator interface {
	Validate(content []byte) (rules.Report, error)
}

// Client identifies the tool that performed the upload.
type Client struct {
	Name    string `json:"name"`
	Version string `json:"version"`
}

// File is a shared file as sent by the client.
type File struct {
	Path    string
	Content string
}

// Request is a share request.
type Request struct {
	Hostname string
	Client   Client
	Files    []File
}

// AcceptedFile describes a stored file.
type AcceptedFile struct {
	Path   string `json:"path"`
	Size   int    `json:"size"`
	SHA256 string `json:"sha256"`
	rules.Report
}

// RejectedFile describes a file that was not stored, and why.
type RejectedFile struct {
	Path   string `json:"path"`
	Reason string `json:"reason"`
}

// Manifest describes an upload. It is stored as manifest.json and returned to the client.
type Manifest struct {
	SchemaVersion int            `json:"schema_version"`
	ID            string         `json:"id"`
	ReceivedAt    time.Time      `json:"received_at"`
	Hostname      string         `json:"hostname"`
	Client        Client         `json:"client"`
	Files         []AcceptedFile `json:"files"`
	Rejected      []RejectedFile `json:"rejected,omitempty"`
}

// Limits bounds what a single request may contain.
type Limits struct {
	MaxFiles     int
	MaxFileBytes int
}

// Service validates and stores shared rule files.
type Service struct {
	store     ObjectStore
	validator RuleValidator
	limits    Limits
	logger    *slog.Logger
	now       func() time.Time
}

// NewService returns a Service.
func NewService(store ObjectStore, validator RuleValidator, limits Limits, logger *slog.Logger) *Service {
	return &Service{store: store, validator: validator, limits: limits, logger: logger, now: time.Now}
}

// Share validates every file, stores the accepted ones and their manifest, and
// returns the manifest. When no file is accepted, it returns the manifest
// (listing the rejections) together with ErrNoValidFiles.
func (s *Service) Share(ctx context.Context, req Request) (Manifest, error) {
	if len(req.Files) == 0 {
		return Manifest{}, fmt.Errorf("%w: no file", ErrInvalidRequest)
	}
	if len(req.Files) > s.limits.MaxFiles {
		return Manifest{}, fmt.Errorf("%w: too many files (%d > %d)", ErrInvalidRequest, len(req.Files), s.limits.MaxFiles)
	}

	receivedAt := s.now().UTC().Truncate(time.Millisecond)
	hostname := sanitizeHostname(req.Hostname)
	manifest := Manifest{
		SchemaVersion: ManifestSchemaVersion,
		ID:            path.Join(receivedAt.Format(time.DateOnly), hostname, receivedAt.Format("150405.000")+"Z"),
		ReceivedAt:    receivedAt,
		Hostname:      hostname,
		Client: Client{
			Name:    truncate(req.Client.Name, maxClientFieldLength),
			Version: truncate(req.Client.Version, maxClientFieldLength),
		},
		Files: []AcceptedFile{},
	}

	contents := map[string][]byte{}
	for _, file := range req.Files {
		accepted, content, reason := s.inspect(file, contents)
		if reason != "" {
			manifest.Rejected = append(manifest.Rejected, RejectedFile{Path: truncate(file.Path, maxPathLength), Reason: reason})
			continue
		}
		contents[accepted.Path] = content
		manifest.Files = append(manifest.Files, accepted)
	}

	logger := s.logger.With(slog.String("upload_id", manifest.ID))
	if len(manifest.Files) == 0 {
		logger.InfoContext(ctx, "share rejected", slog.Int("rejected", len(manifest.Rejected)))
		return manifest, ErrNoValidFiles
	}

	if err := s.storeFiles(ctx, manifest.ID, contents); err != nil {
		return Manifest{}, err
	}
	if err := s.storeManifest(ctx, manifest); err != nil {
		return Manifest{}, err
	}

	logger.InfoContext(ctx, "share stored",
		slog.Int("files", len(manifest.Files)),
		slog.Int("rejected", len(manifest.Rejected)),
		slog.Int("rules", countRules(manifest.Files)),
		slog.String("client_version", manifest.Client.Version),
	)
	return manifest, nil
}

// inspect returns the accepted file and its content, or a rejection reason.
func (s *Service) inspect(file File, seen map[string][]byte) (AcceptedFile, []byte, string) {
	objectPath, err := sanitizePath(file.Path)
	if err != nil {
		return AcceptedFile{}, nil, err.Error()
	}
	if _, duplicate := seen[objectPath]; duplicate {
		return AcceptedFile{}, nil, "duplicate path"
	}
	if len(file.Content) > s.limits.MaxFileBytes {
		return AcceptedFile{}, nil, fmt.Sprintf("file is larger than %d bytes", s.limits.MaxFileBytes)
	}
	if !utf8.ValidString(file.Content) {
		return AcceptedFile{}, nil, "file is not valid UTF-8"
	}

	content := []byte(file.Content)
	report, err := s.validator.Validate(content)
	if err != nil {
		return AcceptedFile{}, nil, err.Error()
	}

	digest := sha256.Sum256(content)
	return AcceptedFile{
		Path:   objectPath,
		Size:   len(content),
		SHA256: hex.EncodeToString(digest[:]),
		Report: report,
	}, content, ""
}

func (s *Service) storeFiles(ctx context.Context, uploadID string, contents map[string][]byte) error {
	group, groupCtx := errgroup.WithContext(ctx)
	group.SetLimit(uploadConcurrency)
	for objectPath, content := range contents {
		group.Go(func() error {
			return s.store.Put(groupCtx, path.Join(uploadID, objectPath), content, yamlContentType)
		})
	}
	if err := group.Wait(); err != nil {
		return oops.In("share").With("upload_id", uploadID).Wrapf(err, "store files")
	}
	return nil
}

func (s *Service) storeManifest(ctx context.Context, manifest Manifest) error {
	body, err := encodeManifest(manifest)
	if err != nil {
		return oops.In("share").Wrapf(err, "encode manifest")
	}
	if err := s.store.Put(ctx, path.Join(manifest.ID, ManifestName), body, jsonContentType); err != nil {
		return oops.In("share").With("upload_id", manifest.ID).Wrapf(err, "store manifest")
	}
	return nil
}

func countRules(files []AcceptedFile) int {
	total := 0
	for _, file := range files {
		total += file.Rules()
	}
	return total
}

// truncate bounds an untrusted client string before it is stored or echoed.
func truncate(value string, maxBytes int) string {
	if len(value) <= maxBytes {
		return strings.ToValidUTF8(value, "")
	}
	// Cutting at a byte offset may split a multi-byte rune; drop the fragment.
	return strings.ToValidUTF8(value[:maxBytes], "")
}
