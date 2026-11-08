package api

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/samber/awesome-prometheus-alerts/server/internal/share"
)

type fakeSharer struct {
	manifest share.Manifest
	err      error
	got      share.Request
}

func (f *fakeSharer) Share(_ context.Context, req share.Request) (share.Manifest, error) {
	f.got = req
	return f.manifest, f.err
}

func newTestRouter(sharer Sharer, rateLimit int) http.Handler {
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	handler := NewHandler(sharer, 1024, logger)
	return NewRouter(handler, RouterOptions{RateLimit: rateLimit, RateLimitWindow: time.Hour}, logger)
}

func postShare(router http.Handler, contentType string, body string) *httptest.ResponseRecorder {
	req := httptest.NewRequest(http.MethodPost, "/v1/shares", strings.NewReader(body))
	req.Header.Set("Content-Type", contentType)
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)
	return rec
}

func TestCreateShareReturnsManifest(t *testing.T) {
	sharer := &fakeSharer{manifest: share.Manifest{ID: "2026-11-08/host/120000.000Z", Hostname: "host"}}
	router := newTestRouter(sharer, 10)

	rec := postShare(router, "application/json; charset=utf-8",
		`{"hostname":"host","client":{"name":"cli","version":"1.0.0"},"files":[{"path":"a.yml","content":"groups: []"}],"future_field":true}`)

	require.Equal(t, http.StatusCreated, rec.Code, rec.Body.String())
	var manifest share.Manifest
	require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &manifest))
	assert.Equal(t, "2026-11-08/host/120000.000Z", manifest.ID)
	assert.Equal(t, share.Request{
		Hostname: "host",
		Client:   share.Client{Name: "cli", Version: "1.0.0"},
		Files:    []share.File{{Path: "a.yml", Content: "groups: []"}},
	}, sharer.got)
}

func TestCreateShareErrors(t *testing.T) {
	tests := map[string]struct {
		sharer      *fakeSharer
		contentType string
		body        string
		status      int
		message     string
	}{
		"wrong content type": {
			sharer: &fakeSharer{}, contentType: "text/plain", body: "{}",
			status: http.StatusUnsupportedMediaType, message: "Content-Type must be application/json",
		},
		"invalid json": {
			sharer: &fakeSharer{}, contentType: "application/json", body: "{",
			status: http.StatusBadRequest, message: "request body is not valid JSON",
		},
		"body too large": {
			sharer: &fakeSharer{}, contentType: "application/json", body: `{"hostname":"` + strings.Repeat("a", 2048) + `"}`,
			status: http.StatusRequestEntityTooLarge, message: "request body is too large",
		},
		"invalid request": {
			sharer: &fakeSharer{err: share.ErrInvalidRequest}, contentType: "application/json", body: "{}",
			status: http.StatusBadRequest, message: share.ErrInvalidRequest.Error(),
		},
		"no valid files": {
			sharer: &fakeSharer{
				err:      share.ErrNoValidFiles,
				manifest: share.Manifest{Rejected: []share.RejectedFile{{Path: "a.yml", Reason: "no groups key"}}},
			},
			contentType: "application/json", body: "{}",
			status: http.StatusUnprocessableEntity, message: "none of the files is a valid Prometheus rule file",
		},
		"storage failure": {
			sharer: &fakeSharer{err: errors.New("s3 down")}, contentType: "application/json", body: "{}",
			status: http.StatusInternalServerError, message: "the upload could not be stored, please retry later",
		},
	}

	for name, tt := range tests {
		t.Run(name, func(t *testing.T) {
			rec := postShare(newTestRouter(tt.sharer, 10), tt.contentType, tt.body)

			require.Equal(t, tt.status, rec.Code)
			var response errorResponse
			require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &response))
			assert.Equal(t, tt.message, response.Error)
			assert.NotContains(t, response.Error, "s3 down", "internal errors must not leak")
		})
	}
}

func TestCreateShareReturnsRejectionsWhenNothingIsValid(t *testing.T) {
	rejected := []share.RejectedFile{{Path: "prometheus.yml", Reason: "not a rule file"}}
	router := newTestRouter(&fakeSharer{err: share.ErrNoValidFiles, manifest: share.Manifest{Rejected: rejected}}, 10)

	rec := postShare(router, "application/json", "{}")

	var response errorResponse
	require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &response))
	assert.Equal(t, rejected, response.Rejected)
}

func TestCreateShareIsRateLimitedPerClientIP(t *testing.T) {
	router := newTestRouter(&fakeSharer{}, 2)

	for range 2 {
		require.Equal(t, http.StatusCreated, postShare(router, "application/json", "{}").Code)
	}
	assert.Equal(t, http.StatusTooManyRequests, postShare(router, "application/json", "{}").Code)
}

func TestHealthzAndIndex(t *testing.T) {
	router := newTestRouter(&fakeSharer{}, 1)

	for path, want := range map[string]string{"/healthz": `"ok"`, "/": "npx awesome-prometheus-alerts share"} {
		rec := httptest.NewRecorder()
		router.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, path, nil))

		assert.Equal(t, http.StatusOK, rec.Code)
		assert.Contains(t, rec.Body.String(), want)
	}
}
