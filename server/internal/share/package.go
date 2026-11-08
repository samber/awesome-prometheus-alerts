package share

import (
	"log/slog"

	"github.com/samber/do/v2"

	"github.com/samber/awesome-prometheus-alerts/server/internal/config"
	"github.com/samber/awesome-prometheus-alerts/server/internal/rules"
	"github.com/samber/awesome-prometheus-alerts/server/internal/storage"
)

// Package registers the share Service.
var Package = do.Package(
	do.Lazy(func(i do.Injector) (*Service, error) {
		cfg := do.MustInvoke[*config.Config](i)
		return NewService(
			do.MustInvoke[*storage.S3Store](i),
			do.MustInvoke[*rules.Validator](i),
			Limits{MaxFiles: cfg.MaxFiles, MaxFileBytes: cfg.MaxFileBytes},
			do.MustInvoke[*slog.Logger](i),
		), nil
	}),
)
