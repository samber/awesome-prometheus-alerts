package api

import (
	"log/slog"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/httprate"
)

// RouterOptions configures NewRouter.
type RouterOptions struct {
	// TrustedProxyCIDRs lists reverse proxies allowed to set X-Forwarded-For.
	TrustedProxyCIDRs []string
	RateLimit         int
	RateLimitWindow   time.Duration
}

// NewRouter wires the middlewares and routes.
func NewRouter(handler *Handler, opts RouterOptions, logger *slog.Logger) http.Handler {
	router := chi.NewRouter()
	router.Use(middleware.RequestID)
	if len(opts.TrustedProxyCIDRs) > 0 {
		router.Use(middleware.ClientIPFromXFF(opts.TrustedProxyCIDRs...))
	} else {
		router.Use(middleware.ClientIPFromRemoteAddr)
	}
	router.Use(requestLogger(logger))
	router.Use(middleware.Recoverer)

	router.Get("/", Index)
	router.Get("/healthz", Healthz)
	router.With(httprate.LimitBy(opts.RateLimit, opts.RateLimitWindow, clientIPKey)).
		Post("/v1/shares", handler.CreateShare)
	return router
}

func clientIPKey(r *http.Request) (string, error) {
	return httprate.CanonicalizeIP(middleware.GetClientIP(r.Context())), nil
}

// requestLogger logs one line per request. Client IPs are deliberately not
// logged: they are personal data and are only needed in memory for rate limiting.
func requestLogger(logger *slog.Logger) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			start := time.Now()
			wrapped := middleware.NewWrapResponseWriter(w, r.ProtoMajor)
			next.ServeHTTP(wrapped, r)

			level := slog.LevelInfo
			if wrapped.Status() >= http.StatusInternalServerError {
				level = slog.LevelError
			} else if r.URL.Path == "/healthz" {
				level = slog.LevelDebug
			}
			logger.Log(r.Context(), level, "http request",
				slog.String("request_id", middleware.GetReqID(r.Context())),
				slog.String("method", r.Method),
				slog.String("path", r.URL.Path),
				slog.Int("status", wrapped.Status()),
				slog.Int("bytes", wrapped.BytesWritten()),
				slog.Duration("duration", time.Since(start)),
				slog.String("user_agent", r.UserAgent()),
			)
		})
	}
}
