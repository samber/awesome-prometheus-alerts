package api

import (
	"context"
	"errors"
	"log/slog"
	"net"
	"net/http"
	"time"

	"github.com/samber/oops"
)

const (
	readHeaderTimeout = 10 * time.Second
	// readTimeout must allow a 16 MiB body over a slow uplink.
	readTimeout  = 2 * time.Minute
	writeTimeout = 2 * time.Minute
	idleTimeout  = 2 * time.Minute
)

// Server is the HTTP server. Its Shutdown method lets samber/do stop it gracefully.
type Server struct {
	http   *http.Server
	logger *slog.Logger
}

// NewServer returns a Server listening on addr.
func NewServer(addr string, handler http.Handler, logger *slog.Logger) *Server {
	return &Server{
		http: &http.Server{
			Addr:              addr,
			Handler:           handler,
			ReadHeaderTimeout: readHeaderTimeout,
			ReadTimeout:       readTimeout,
			WriteTimeout:      writeTimeout,
			IdleTimeout:       idleTimeout,
			ErrorLog:          slog.NewLogLogger(logger.Handler(), slog.LevelWarn),
		},
		logger: logger,
	}
}

// ListenAndServe blocks until the server stops. It returns nil after Shutdown.
func (s *Server) ListenAndServe(ctx context.Context) error {
	var listenConfig net.ListenConfig
	listener, err := listenConfig.Listen(ctx, "tcp", s.http.Addr)
	if err != nil {
		return oops.In("api").With("addr", s.http.Addr).Wrapf(err, "listen")
	}
	s.logger.Info("share server listening", slog.String("addr", listener.Addr().String()))
	if err := s.http.Serve(listener); err != nil && !errors.Is(err, http.ErrServerClosed) {
		return oops.In("api").Wrapf(err, "serve")
	}
	return nil
}

// Shutdown waits for in-flight uploads to complete, up to the context deadline.
func (s *Server) Shutdown(ctx context.Context) error {
	return s.http.Shutdown(ctx)
}
