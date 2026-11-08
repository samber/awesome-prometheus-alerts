// Package logging builds the structured logger shared by the server.
package logging

import (
	"io"
	"log/slog"

	"github.com/samber/awesome-prometheus-alerts/server/internal/config"
)

// New returns a human-readable text logger in dev and a JSON logger otherwise.
func New(cfg *config.Config, out io.Writer) *slog.Logger {
	opts := &slog.HandlerOptions{Level: cfg.LogLevel}
	if cfg.IsDev() {
		return slog.New(slog.NewTextHandler(out, opts))
	}
	return slog.New(slog.NewJSONHandler(out, opts))
}
