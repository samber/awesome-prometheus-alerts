// Package config loads the server configuration from environment variables.
package config

import (
	"fmt"
	"log/slog"
	"net/netip"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/samber/oops"
)

// Environments accepted by the ENV variable.
const (
	EnvDev  = "dev"
	EnvProd = "prod"
)

const (
	defaultListenAddr      = ":4242"
	defaultS3Region        = "us-east-1"
	defaultS3Endpoint      = "https://s3.amazonaws.com"
	defaultRateLimit       = 10
	defaultRateLimitWindow = time.Hour
	defaultMaxFiles        = 500
	defaultMaxFileBytes    = 1 << 20 // 1 MiB
	// defaultMaxBodyBytes leaves room for JSON escaping on top of the CLI's
	// 10 MiB total content cap.
	defaultMaxBodyBytes = 16 << 20
)

// Config holds every runtime setting of the share server.
type Config struct {
	Env        string
	ListenAddr string
	LogLevel   slog.Level

	// TrustedProxyCIDRs lists reverse proxies allowed to set X-Forwarded-For.
	// When empty, the TCP peer address is the client IP.
	TrustedProxyCIDRs []string
	RateLimit         int
	RateLimitWindow   time.Duration

	MaxBodyBytes int64
	MaxFiles     int
	MaxFileBytes int

	S3Bucket string
	S3Region string
	// S3Endpoint is the URL of AWS S3 or of an S3-compatible service.
	S3Endpoint       string
	S3Prefix         string
	S3ForcePathStyle bool
}

// IsDev reports whether the server runs in the development environment.
func (c *Config) IsDev() bool {
	return c.Env == EnvDev
}

// Load reads the configuration from the process environment.
func Load() (*Config, error) {
	return LoadFrom(os.LookupEnv)
}

// LoadFrom reads the configuration through lookup, which mirrors os.LookupEnv.
func LoadFrom(lookup func(string) (string, bool)) (*Config, error) {
	r := reader{lookup: lookup}
	cfg := &Config{
		Env:               r.string("ENV", EnvProd),
		ListenAddr:        r.string("LISTEN_ADDR", defaultListenAddr),
		LogLevel:          r.logLevel("LOG_LEVEL", slog.LevelInfo),
		TrustedProxyCIDRs: r.list("TRUSTED_PROXY_CIDRS"),
		RateLimit:         r.int("RATE_LIMIT_REQUESTS", defaultRateLimit),
		RateLimitWindow:   r.duration("RATE_LIMIT_WINDOW", defaultRateLimitWindow),
		MaxBodyBytes:      int64(r.int("MAX_BODY_BYTES", defaultMaxBodyBytes)),
		MaxFiles:          r.int("MAX_FILES", defaultMaxFiles),
		MaxFileBytes:      r.int("MAX_FILE_BYTES", defaultMaxFileBytes),
		S3Bucket:          r.string("S3_BUCKET", ""),
		S3Region:          r.string("S3_REGION", defaultS3Region),
		S3Endpoint:        r.string("S3_ENDPOINT", defaultS3Endpoint),
		S3Prefix:          strings.Trim(r.string("S3_PREFIX", ""), "/"),
		S3ForcePathStyle:  r.bool("S3_FORCE_PATH_STYLE", false),
	}

	if len(r.errs) > 0 {
		return nil, oops.In("config").Join(r.errs...)
	}
	if err := cfg.validate(); err != nil {
		return nil, err
	}
	return cfg, nil
}

func (c *Config) validate() error {
	builder := oops.In("config")
	if c.Env != EnvDev && c.Env != EnvProd {
		return builder.Errorf("ENV must be %q or %q, got %q", EnvDev, EnvProd, c.Env)
	}
	if c.S3Bucket == "" {
		return builder.Errorf("S3_BUCKET is required")
	}
	for _, cidr := range c.TrustedProxyCIDRs {
		if _, err := netip.ParsePrefix(cidr); err != nil {
			return builder.With("cidr", cidr).Wrapf(err, "TRUSTED_PROXY_CIDRS contains an invalid prefix")
		}
	}
	if c.RateLimit <= 0 || c.RateLimitWindow <= 0 {
		return builder.Errorf("RATE_LIMIT_REQUESTS and RATE_LIMIT_WINDOW must be positive")
	}
	if c.MaxFiles <= 0 || c.MaxFileBytes <= 0 || c.MaxBodyBytes <= 0 {
		return builder.Errorf("MAX_FILES, MAX_FILE_BYTES and MAX_BODY_BYTES must be positive")
	}
	return nil
}

// reader accumulates parsing errors so that every invalid variable is
// reported at once instead of one per restart.
type reader struct {
	lookup func(string) (string, bool)
	errs   []error
}

func (r *reader) string(key string, fallback string) string {
	value, ok := r.lookup(key)
	value = strings.TrimSpace(value)
	if !ok || value == "" {
		return fallback
	}
	return value
}

func (r *reader) list(key string) []string {
	var items []string
	for item := range strings.SplitSeq(r.string(key, ""), ",") {
		if item = strings.TrimSpace(item); item != "" {
			items = append(items, item)
		}
	}
	return items
}

func (r *reader) int(key string, fallback int) int {
	raw := r.string(key, "")
	if raw == "" {
		return fallback
	}
	value, err := strconv.Atoi(raw)
	if err != nil {
		r.errs = append(r.errs, fmt.Errorf("%s: %w", key, err))
		return fallback
	}
	return value
}

func (r *reader) bool(key string, fallback bool) bool {
	raw := r.string(key, "")
	if raw == "" {
		return fallback
	}
	value, err := strconv.ParseBool(raw)
	if err != nil {
		r.errs = append(r.errs, fmt.Errorf("%s: %w", key, err))
		return fallback
	}
	return value
}

func (r *reader) duration(key string, fallback time.Duration) time.Duration {
	raw := r.string(key, "")
	if raw == "" {
		return fallback
	}
	value, err := time.ParseDuration(raw)
	if err != nil {
		r.errs = append(r.errs, fmt.Errorf("%s: %w", key, err))
		return fallback
	}
	return value
}

func (r *reader) logLevel(key string, fallback slog.Level) slog.Level {
	raw := r.string(key, "")
	if raw == "" {
		return fallback
	}
	var level slog.Level
	if err := level.UnmarshalText([]byte(raw)); err != nil {
		r.errs = append(r.errs, fmt.Errorf("%s: %w", key, err))
		return fallback
	}
	return level
}
