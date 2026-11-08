// Package storage writes shared files to an S3-compatible bucket.
package storage

import (
	"bytes"
	"context"
	"errors"
	"log/slog"
	"net/url"
	"path"
	"time"

	"github.com/minio/minio-go/v7"
	"github.com/minio/minio-go/v7/pkg/credentials"
	"github.com/samber/oops"

	"github.com/samber/awesome-prometheus-alerts/server/internal/config"
)

const (
	pingAttempts = 15
	pingDelay    = 2 * time.Second
)

// S3Store puts objects into a single bucket, under an optional key prefix.
type S3Store struct {
	client *minio.Client
	bucket string
	prefix string
}

// NewS3Store builds a store from the configuration. Credentials are looked up,
// in order, in AWS_* variables, MINIO_* variables, the shared AWS credentials
// file, then the IAM role of the host (EC2, ECS, EKS web identity).
func NewS3Store(cfg *config.Config) (*S3Store, error) {
	endpoint, err := url.Parse(cfg.S3Endpoint)
	if err != nil || endpoint.Host == "" || (endpoint.Scheme != "http" && endpoint.Scheme != "https") {
		return nil, oops.In("storage").With("endpoint", cfg.S3Endpoint).Errorf("S3_ENDPOINT must be an http(s) URL")
	}

	lookup := minio.BucketLookupAuto
	if cfg.S3ForcePathStyle {
		lookup = minio.BucketLookupPath
	}

	client, err := minio.New(endpoint.Host, &minio.Options{
		Creds: credentials.NewChainCredentials([]credentials.Provider{
			&credentials.EnvAWS{},
			&credentials.EnvMinio{},
			&credentials.FileAWSCredentials{},
			&credentials.IAM{},
		}),
		Secure:       endpoint.Scheme == "https",
		Region:       cfg.S3Region,
		BucketLookup: lookup,
	})
	if err != nil {
		return nil, oops.In("storage").Wrapf(err, "create S3 client")
	}
	return &S3Store{client: client, bucket: cfg.S3Bucket, prefix: cfg.S3Prefix}, nil
}

// Put writes body under key, relative to the configured prefix.
func (s *S3Store) Put(ctx context.Context, key string, body []byte, contentType string) error {
	fullKey := path.Join(s.prefix, key)
	_, err := s.client.PutObject(ctx, s.bucket, fullKey, bytes.NewReader(body), int64(len(body)), minio.PutObjectOptions{
		ContentType: contentType,
	})
	if err != nil {
		return oops.In("storage").With("bucket", s.bucket, "key", fullKey).Wrapf(err, "put object")
	}
	return nil
}

// WaitUntilReachable checks that the bucket exists and is accessible,
// retrying so that the server tolerates an object store that starts later.
func (s *S3Store) WaitUntilReachable(ctx context.Context, logger *slog.Logger) error {
	var err error
	for attempt := 1; attempt <= pingAttempts; attempt++ {
		var exists bool
		exists, err = s.client.BucketExists(ctx, s.bucket)
		if err == nil && exists {
			return nil
		}
		if err == nil {
			err = errors.New("bucket does not exist")
		}
		logger.WarnContext(ctx, "bucket not reachable yet",
			slog.String("bucket", s.bucket),
			slog.Int("attempt", attempt),
			slog.Any("error", err),
		)
		select {
		case <-ctx.Done():
			return oops.In("storage").Wrap(ctx.Err())
		case <-time.After(pingDelay):
		}
	}
	return oops.In("storage").With("bucket", s.bucket).Wrapf(err, "bucket not reachable")
}
