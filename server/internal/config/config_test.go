package config

import (
	"log/slog"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func lookupFrom(env map[string]string) func(string) (string, bool) {
	return func(key string) (string, bool) {
		value, ok := env[key]
		return value, ok
	}
}

func TestLoadDefaults(t *testing.T) {
	cfg, err := LoadFrom(lookupFrom(map[string]string{"S3_BUCKET": "shares"}))

	require.NoError(t, err)
	assert.Equal(t, EnvProd, cfg.Env)
	assert.Equal(t, ":4242", cfg.ListenAddr)
	assert.Equal(t, slog.LevelInfo, cfg.LogLevel)
	assert.Equal(t, 10, cfg.RateLimit)
	assert.Equal(t, time.Hour, cfg.RateLimitWindow)
	assert.Equal(t, 500, cfg.MaxFiles)
	assert.Equal(t, 1<<20, cfg.MaxFileBytes)
	assert.Equal(t, int64(16<<20), cfg.MaxBodyBytes)
	assert.Equal(t, "us-east-1", cfg.S3Region)
	assert.Equal(t, "https://s3.amazonaws.com", cfg.S3Endpoint)
	assert.False(t, cfg.S3ForcePathStyle)
	assert.Empty(t, cfg.TrustedProxyCIDRs)
}

func TestLoadOverrides(t *testing.T) {
	cfg, err := LoadFrom(lookupFrom(map[string]string{
		"ENV":                 "dev",
		"LOG_LEVEL":           "debug",
		"S3_BUCKET":           "shares",
		"S3_ENDPOINT":         "http://minio:9000",
		"S3_PREFIX":           "/uploads/",
		"S3_FORCE_PATH_STYLE": "true",
		"TRUSTED_PROXY_CIDRS": "10.0.0.0/8, ::1/128",
		"RATE_LIMIT_WINDOW":   "10m",
	}))

	require.NoError(t, err)
	assert.True(t, cfg.IsDev())
	assert.Equal(t, slog.LevelDebug, cfg.LogLevel)
	assert.Equal(t, "uploads", cfg.S3Prefix)
	assert.True(t, cfg.S3ForcePathStyle)
	assert.Equal(t, []string{"10.0.0.0/8", "::1/128"}, cfg.TrustedProxyCIDRs)
	assert.Equal(t, 10*time.Minute, cfg.RateLimitWindow)
}

func TestLoadRejectsInvalidValues(t *testing.T) {
	tests := map[string]map[string]string{
		"missing bucket": {},
		"bad env":        {"S3_BUCKET": "b", "ENV": "staging"},
		"bad int":        {"S3_BUCKET": "b", "MAX_FILES": "many"},
		"bad bool":       {"S3_BUCKET": "b", "S3_FORCE_PATH_STYLE": "maybe"},
		"bad duration":   {"S3_BUCKET": "b", "RATE_LIMIT_WINDOW": "1 hour"},
		"bad log level":  {"S3_BUCKET": "b", "LOG_LEVEL": "verbose"},
		"bad cidr":       {"S3_BUCKET": "b", "TRUSTED_PROXY_CIDRS": "10.0.0.1"},
		"zero limit":     {"S3_BUCKET": "b", "MAX_FILE_BYTES": "0"},
	}

	for name, env := range tests {
		t.Run(name, func(t *testing.T) {
			_, err := LoadFrom(lookupFrom(env))

			require.Error(t, err)
		})
	}
}
