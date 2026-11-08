package api

import (
	"log/slog"

	"github.com/samber/do/v2"

	"github.com/samber/awesome-prometheus-alerts/server/internal/config"
	"github.com/samber/awesome-prometheus-alerts/server/internal/share"
)

// Package registers the HTTP Server.
var Package = do.Package(
	do.Lazy(func(i do.Injector) (*Server, error) {
		cfg := do.MustInvoke[*config.Config](i)
		logger := do.MustInvoke[*slog.Logger](i)
		handler := NewHandler(do.MustInvoke[*share.Service](i), cfg.MaxBodyBytes, logger)
		router := NewRouter(handler, RouterOptions{
			TrustedProxyCIDRs: cfg.TrustedProxyCIDRs,
			RateLimit:         cfg.RateLimit,
			RateLimitWindow:   cfg.RateLimitWindow,
		}, logger)
		return NewServer(cfg.ListenAddr, router, logger), nil
	}),
)
