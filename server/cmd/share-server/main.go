// Command share-server receives Prometheus rule files shared with
// `npx awesome-prometheus-alerts share` and stores them in an S3 bucket.
package main

import (
	"context"
	"fmt"
	"log/slog"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/samber/do/v2"

	"github.com/samber/awesome-prometheus-alerts/server/internal/api"
	"github.com/samber/awesome-prometheus-alerts/server/internal/config"
	"github.com/samber/awesome-prometheus-alerts/server/internal/logging"
	"github.com/samber/awesome-prometheus-alerts/server/internal/rules"
	"github.com/samber/awesome-prometheus-alerts/server/internal/share"
	"github.com/samber/awesome-prometheus-alerts/server/internal/storage"
)

// shutdownTimeout must stay below the orchestrator's kill grace period
// (30s by default on Kubernetes) so in-flight uploads can finish.
const shutdownTimeout = 25 * time.Second

func main() {
	if err := run(); err != nil {
		fmt.Fprintf(os.Stderr, "share-server: %v\n", err)
		os.Exit(1)
	}
}

func run() error {
	injector := do.New(
		config.Package,
		logging.Package,
		rules.Package,
		storage.Package,
		share.Package,
		api.Package,
	)

	server, err := do.Invoke[*api.Server](injector)
	if err != nil {
		return err
	}
	logger := do.MustInvoke[*slog.Logger](injector)

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	serveErr := make(chan error, 1)
	go func() { serveErr <- server.ListenAndServe(ctx) }()

	select {
	case err := <-serveErr:
		return err
	case <-ctx.Done():
		logger.Info("shutting down")
	}

	shutdownCtx, cancel := context.WithTimeout(context.Background(), shutdownTimeout)
	defer cancel()
	if report := injector.ShutdownWithContext(shutdownCtx); report != nil && !report.Succeed {
		return report
	}
	return nil
}
