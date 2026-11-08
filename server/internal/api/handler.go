// Package api exposes the share service over HTTP.
package api

import (
	"context"
	"encoding/json"
	"errors"
	"log/slog"
	"mime"
	"net/http"

	"github.com/go-chi/chi/v5/middleware"

	"github.com/samber/awesome-prometheus-alerts/server/internal/share"
)

// Sharer stores a share request. It is implemented by share.Service.
type Sharer interface {
	Share(ctx context.Context, req share.Request) (share.Manifest, error)
}

type shareRequest struct {
	Hostname string       `json:"hostname"`
	Client   share.Client `json:"client"`
	Files    []struct {
		Path    string `json:"path"`
		Content string `json:"content"`
	} `json:"files"`
}

type errorResponse struct {
	Error    string               `json:"error"`
	Rejected []share.RejectedFile `json:"rejected,omitempty"`
}

// Handler serves the share endpoints.
type Handler struct {
	sharer       Sharer
	maxBodyBytes int64
	logger       *slog.Logger
}

// NewHandler returns a Handler.
func NewHandler(sharer Sharer, maxBodyBytes int64, logger *slog.Logger) *Handler {
	return &Handler{sharer: sharer, maxBodyBytes: maxBodyBytes, logger: logger}
}

// CreateShare handles POST /v1/shares.
func (h *Handler) CreateShare(w http.ResponseWriter, r *http.Request) {
	mediaType, _, err := mime.ParseMediaType(r.Header.Get("Content-Type"))
	if err != nil || mediaType != "application/json" {
		writeJSON(w, http.StatusUnsupportedMediaType, errorResponse{Error: "Content-Type must be application/json"})
		return
	}

	var body shareRequest
	decoder := json.NewDecoder(http.MaxBytesReader(w, r.Body, h.maxBodyBytes))
	if err := decoder.Decode(&body); err != nil {
		var tooLarge *http.MaxBytesError
		if errors.As(err, &tooLarge) {
			writeJSON(w, http.StatusRequestEntityTooLarge, errorResponse{Error: "request body is too large"})
			return
		}
		writeJSON(w, http.StatusBadRequest, errorResponse{Error: "request body is not valid JSON"})
		return
	}

	req := share.Request{Hostname: body.Hostname, Client: body.Client}
	for _, file := range body.Files {
		req.Files = append(req.Files, share.File{Path: file.Path, Content: file.Content})
	}

	manifest, err := h.sharer.Share(r.Context(), req)
	switch {
	case err == nil:
		writeJSON(w, http.StatusCreated, manifest)
	case errors.Is(err, share.ErrNoValidFiles):
		writeJSON(w, http.StatusUnprocessableEntity, errorResponse{
			Error:    "none of the files is a valid Prometheus rule file",
			Rejected: manifest.Rejected,
		})
	case errors.Is(err, share.ErrInvalidRequest):
		writeJSON(w, http.StatusBadRequest, errorResponse{Error: err.Error()})
	default:
		h.logger.ErrorContext(r.Context(), "share failed",
			slog.String("request_id", middleware.GetReqID(r.Context())),
			slog.Any("error", err),
		)
		writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "the upload could not be stored, please retry later"})
	}
}

// Healthz handles GET /healthz.
func Healthz(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

// Index handles GET / for humans who open the endpoint in a browser.
func Index(w http.ResponseWriter, _ *http.Request) {
	w.Header().Set("Content-Type", "text/plain; charset=utf-8")
	_, _ = w.Write([]byte("awesome-prometheus-alerts share server\n\nShare your alerting rules with:\n\n  npx awesome-prometheus-alerts share <files or directories...>\n"))
}

func writeJSON(w http.ResponseWriter, status int, value any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(value)
}
