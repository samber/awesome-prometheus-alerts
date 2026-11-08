package share

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"log/slog"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/samber/awesome-prometheus-alerts/server/internal/rules"
)

const validRules = `
groups:
  - name: example
    rules:
      - alert: ExampleDown
        expr: up == 0
`

type putCall struct {
	key         string
	body        string
	contentType string
}

type memoryStore struct {
	mu    sync.Mutex
	calls []putCall
	err   error
}

func (m *memoryStore) Put(_ context.Context, key string, body []byte, contentType string) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	if m.err != nil {
		return m.err
	}
	m.calls = append(m.calls, putCall{key: key, body: string(body), contentType: contentType})
	return nil
}

func (m *memoryStore) objects() map[string]putCall {
	m.mu.Lock()
	defer m.mu.Unlock()
	objects := map[string]putCall{}
	for _, call := range m.calls {
		objects[call.key] = call
	}
	return objects
}

func newTestService(store ObjectStore) *Service {
	service := NewService(store, rules.NewValidator(), Limits{MaxFiles: 3, MaxFileBytes: 1024}, slog.New(slog.NewTextHandler(io.Discard, nil)))
	service.now = func() time.Time {
		return time.Date(2026, 11, 8, 23, 30, 12, 457_900_000, time.FixedZone("CET", 3600))
	}
	return service
}

func TestShareStoresFilesUnderDateHostnameAndTime(t *testing.T) {
	store := &memoryStore{}
	service := newTestService(store)

	manifest, err := service.Share(context.Background(), Request{
		Hostname: "Prod-Prometheus-01.example.com",
		Client:   Client{Name: "awesome-prometheus-alerts", Version: "1.0.0"},
		Files: []File{
			{Path: "rules/node.yml", Content: validRules},
			{Path: "prometheus.yml", Content: "global: {}\n"},
		},
	})

	require.NoError(t, err)
	// The date folder follows UTC, not the server's local zone.
	assert.Equal(t, "2026-11-08/prod-prometheus-01.example.com/223012.457Z", manifest.ID)
	assert.Equal(t, "prod-prometheus-01.example.com", manifest.Hostname)
	require.Len(t, manifest.Files, 1)
	assert.Equal(t, "rules/node.yml", manifest.Files[0].Path)
	assert.Equal(t, 1, manifest.Files[0].AlertingRules)
	assert.Len(t, manifest.Files[0].SHA256, 64)
	require.Len(t, manifest.Rejected, 1)
	assert.Equal(t, "prometheus.yml", manifest.Rejected[0].Path)
	assert.Contains(t, manifest.Rejected[0].Reason, "no groups key")

	objects := store.objects()
	require.Len(t, objects, 2)
	file := objects["2026-11-08/prod-prometheus-01.example.com/223012.457Z/rules/node.yml"]
	assert.Equal(t, validRules, file.body)
	assert.Equal(t, "application/yaml", file.contentType)

	stored := objects["2026-11-08/prod-prometheus-01.example.com/223012.457Z/manifest.json"]
	assert.Equal(t, "application/json", stored.contentType)
	var decoded Manifest
	require.NoError(t, json.Unmarshal([]byte(stored.body), &decoded))
	assert.Equal(t, manifest, decoded)
}

func TestShareWritesManifestLast(t *testing.T) {
	store := &memoryStore{}
	service := newTestService(store)

	_, err := service.Share(context.Background(), Request{Hostname: "h", Files: []File{
		{Path: "a.yml", Content: validRules},
		{Path: "b.yml", Content: validRules},
	}})

	require.NoError(t, err)
	require.Len(t, store.calls, 3)
	assert.True(t, strings.HasSuffix(store.calls[2].key, "/manifest.json"))
}

func TestShareRejectsWhenNoFileIsValid(t *testing.T) {
	store := &memoryStore{}
	service := newTestService(store)

	manifest, err := service.Share(context.Background(), Request{Hostname: "h", Files: []File{
		{Path: "a.yml", Content: "global: {}"},
		{Path: "notes.txt", Content: validRules},
		{Path: "big.yml", Content: strings.Repeat("#", 2048)},
	}})

	require.ErrorIs(t, err, ErrNoValidFiles)
	assert.Empty(t, manifest.Files)
	require.Len(t, manifest.Rejected, 3)
	assert.Equal(t, "only .yml and .yaml files are accepted", manifest.Rejected[1].Reason)
	assert.Equal(t, "file is larger than 1024 bytes", manifest.Rejected[2].Reason)
	assert.Empty(t, store.calls)
}

func TestShareRejectsDuplicateAndInvalidUTF8(t *testing.T) {
	store := &memoryStore{}
	service := newTestService(store)

	manifest, err := service.Share(context.Background(), Request{Hostname: "h", Files: []File{
		{Path: "rules/a.yml", Content: validRules},
		{Path: "rules//a.yml", Content: validRules},
		{Path: "b.yml", Content: "groups: \xff"},
	}})

	require.NoError(t, err)
	require.Len(t, manifest.Rejected, 2)
	assert.Equal(t, "duplicate path", manifest.Rejected[0].Reason)
	assert.Equal(t, "file is not valid UTF-8", manifest.Rejected[1].Reason)
}

func TestShareValidatesRequest(t *testing.T) {
	service := newTestService(&memoryStore{})

	_, err := service.Share(context.Background(), Request{Hostname: "h"})
	require.ErrorIs(t, err, ErrInvalidRequest)

	_, err = service.Share(context.Background(), Request{Hostname: "h", Files: make([]File, 4)})
	require.ErrorIs(t, err, ErrInvalidRequest)
}

func TestShareReturnsStorageErrors(t *testing.T) {
	store := &memoryStore{err: errors.New("boom")}
	service := newTestService(store)

	_, err := service.Share(context.Background(), Request{Hostname: "h", Files: []File{{Path: "a.yml", Content: validRules}}})

	require.Error(t, err)
	assert.ErrorContains(t, err, "boom")
}

func TestShareTruncatesClientFields(t *testing.T) {
	service := newTestService(&memoryStore{})

	manifest, err := service.Share(context.Background(), Request{
		Hostname: "h",
		Client:   Client{Name: strings.Repeat("é", 40), Version: "1.0.0"},
		Files:    []File{{Path: "a.yml", Content: validRules}},
	})

	require.NoError(t, err)
	assert.LessOrEqual(t, len(manifest.Client.Name), maxClientFieldLength)
	assert.NotContains(t, manifest.Client.Name, "�")
}
