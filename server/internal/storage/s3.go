// Package storage writes shared files to an S3-compatible bucket.
package storage

import (
	"bytes"
	"context"
	"log/slog"
	"path"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	awsconfig "github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/samber/oops"

	"github.com/samber/awesome-prometheus-alerts/server/internal/config"
)

const (
	pingAttempts = 15
	pingDelay    = 2 * time.Second
)

// S3Store puts objects into a single bucket, under an optional key prefix.
type S3Store struct {
	client *s3.Client
	bucket string
	prefix string
}

// NewS3Store builds a store from the configuration. Credentials come from the
// default AWS chain (AWS_ACCESS_KEY_ID/AWS_SECRET_ACCESS_KEY, profile, IAM role).
func NewS3Store(ctx context.Context, cfg *config.Config) (*S3Store, error) {
	awsCfg, err := awsconfig.LoadDefaultConfig(ctx,
		awsconfig.WithRegion(cfg.S3Region),
		// Several S3-compatible providers reject the CRC checksums the SDK
		// sends by default; only send them when an operation requires it.
		awsconfig.WithRequestChecksumCalculation(aws.RequestChecksumCalculationWhenRequired),
		awsconfig.WithResponseChecksumValidation(aws.ResponseChecksumValidationWhenRequired),
	)
	if err != nil {
		return nil, oops.In("storage").Wrapf(err, "load AWS configuration")
	}

	client := s3.NewFromConfig(awsCfg, func(o *s3.Options) {
		if cfg.S3Endpoint != "" {
			o.BaseEndpoint = aws.String(cfg.S3Endpoint)
		}
		o.UsePathStyle = cfg.S3ForcePathStyle
	})
	return &S3Store{client: client, bucket: cfg.S3Bucket, prefix: cfg.S3Prefix}, nil
}

// Put writes body under key, relative to the configured prefix.
func (s *S3Store) Put(ctx context.Context, key string, body []byte, contentType string) error {
	fullKey := path.Join(s.prefix, key)
	_, err := s.client.PutObject(ctx, &s3.PutObjectInput{
		Bucket:        aws.String(s.bucket),
		Key:           aws.String(fullKey),
		Body:          bytes.NewReader(body),
		ContentLength: aws.Int64(int64(len(body))),
		ContentType:   aws.String(contentType),
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
		_, err = s.client.HeadBucket(ctx, &s3.HeadBucketInput{Bucket: aws.String(s.bucket)})
		if err == nil {
			return nil
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
