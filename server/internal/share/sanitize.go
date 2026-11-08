package share

import (
	"errors"
	"path"
	"regexp"
	"strings"
)

const (
	maxHostnameLength = 128
	maxPathLength     = 256
	maxPathDepth      = 12
	unknownHostname   = "unknown-host"
)

var (
	hostnameUnsafeChars = regexp.MustCompile(`[^a-z0-9.-]+`)
	segmentUnsafeChars  = regexp.MustCompile(`[^A-Za-z0-9._-]+`)
)

// sanitizeHostname turns a client-supplied hostname into a single safe object
// key segment. The value is untrusted: it must never introduce a `/` or a
// `..` segment into the S3 key.
func sanitizeHostname(raw string) string {
	hostname := strings.ToLower(strings.TrimSpace(raw))
	hostname = hostnameUnsafeChars.ReplaceAllString(hostname, "-")
	if len(hostname) > maxHostnameLength {
		hostname = hostname[:maxHostnameLength]
	}
	hostname = strings.Trim(hostname, ".-")
	if hostname == "" {
		return unknownHostname
	}
	return hostname
}

// sanitizePath turns a client-supplied relative file path into a safe object
// key suffix. Directory structure is kept so that operators can recognize
// their layout, but absolute paths, parent references and unusual characters
// are removed.
func sanitizePath(raw string) (string, error) {
	cleaned := path.Clean("/" + strings.ReplaceAll(raw, `\`, "/"))
	cleaned = strings.TrimPrefix(cleaned, "/")
	if cleaned == "" {
		return "", errors.New("empty path")
	}

	segments := strings.Split(cleaned, "/")
	if len(segments) > maxPathDepth {
		return "", errors.New("path is too deep")
	}
	for i, segment := range segments {
		segment = segmentUnsafeChars.ReplaceAllString(segment, "_")
		// path.Clean already removed "." and ".." segments; this guards
		// against segments made only of dots after replacement.
		if strings.Trim(segment, ".") == "" {
			segment = "_"
		}
		segments[i] = segment
	}

	sanitized := strings.Join(segments, "/")
	if len(sanitized) > maxPathLength {
		return "", errors.New("path is too long")
	}
	extension := strings.ToLower(path.Ext(sanitized))
	if extension != ".yml" && extension != ".yaml" {
		return "", errors.New("only .yml and .yaml files are accepted")
	}
	return sanitized, nil
}
