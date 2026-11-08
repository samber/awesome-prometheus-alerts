package share

import (
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestSanitizeHostname(t *testing.T) {
	tests := map[string]string{
		"prometheus-01":              "prometheus-01",
		"Prod.Example.COM":           "prod.example.com",
		"  my host  ":                "my-host",
		"../../etc":                  "etc",
		"a/b\\c":                     "a-b-c",
		"..":                         unknownHostname,
		"":                           unknownHostname,
		"héllo wörld":                "h-llo-w-rld",
		"-leading.and.trailing.-":    "leading.and.trailing",
		strings.Repeat("a", 200):     strings.Repeat("a", maxHostnameLength),
		"DESKTOP-ABC123\u0000\nnext": "desktop-abc123-next",
	}

	for raw, want := range tests {
		t.Run(raw, func(t *testing.T) {
			got := sanitizeHostname(raw)

			assert.Equal(t, want, got)
			assert.NotContains(t, got, "/")
		})
	}
}

func TestSanitizePathAccepts(t *testing.T) {
	tests := map[string]string{
		"rules/node.yml":             "rules/node.yml",
		"/etc/prometheus/rules.yaml": "etc/prometheus/rules.yaml",
		"../../secret/x.yml":         "secret/x.yml",
		`rules\windows\a.yml`:        "rules/windows/a.yml",
		"my rules/Node (1).YML":      "my_rules/Node_1_.YML",
		"./a/./b/../c.yml":           "a/c.yml",
		"...hidden/x.yml":            "...hidden/x.yml",
	}

	for raw, want := range tests {
		t.Run(raw, func(t *testing.T) {
			got, err := sanitizePath(raw)

			require.NoError(t, err)
			assert.Equal(t, want, got)
		})
	}
}

func TestSanitizePathRejects(t *testing.T) {
	tests := map[string]string{
		"":                                 "empty path",
		"/":                                "empty path",
		"../..":                            "empty path",
		"notes.txt":                        "only .yml and .yaml files are accepted",
		"rules/":                           "only .yml and .yaml files are accepted",
		strings.Repeat("a/", 13) + "x.yml": "path is too deep",
		strings.Repeat("a", 300) + ".yml":  "path is too long",
	}

	for raw, want := range tests {
		t.Run(want, func(t *testing.T) {
			_, err := sanitizePath(raw)

			require.EqualError(t, err, want)
		})
	}
}
