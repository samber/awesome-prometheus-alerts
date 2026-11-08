package storage

import (
	"context"
	"log/slog"

	"github.com/samber/do/v2"

	"github.com/samber/awesome-prometheus-alerts/server/internal/config"
)

// Package registers the S3Store, after checking that its bucket is reachable.
var Package = do.Package(
	do.Lazy(func(i do.Injector) (*S3Store, error) {
		ctx := context.Background()
		store, err := NewS3Store(ctx, do.MustInvoke[*config.Config](i))
		if err != nil {
			return nil, err
		}
		if err := store.WaitUntilReachable(ctx, do.MustInvoke[*slog.Logger](i)); err != nil {
			return nil, err
		}
		return store, nil
	}),
)
