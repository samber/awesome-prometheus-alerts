package logging

import (
	"log/slog"
	"os"

	"github.com/samber/do/v2"

	"github.com/samber/awesome-prometheus-alerts/server/internal/config"
)

// Package registers the *slog.Logger writing to stdout.
var Package = do.Package(
	do.Lazy(func(i do.Injector) (*slog.Logger, error) {
		return New(do.MustInvoke[*config.Config](i), os.Stdout), nil
	}),
)
