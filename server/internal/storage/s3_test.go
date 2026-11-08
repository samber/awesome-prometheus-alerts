package storage

import (
	"context"
	"io"
	"net/http"
	"net/http/httptest"
	"sync"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/samber/awesome-prometheus-alerts/server/internal/config"
)

type recordedRequest struct {
	method      string
	path        string
	contentType string
	body        string
}

// fakeS3 records requests and answers like a path-style S3 endpoint.
func fakeS3(t *testing.T, status int) (*httptest.Server, func() []recordedRequest) {
	t.Helper()
	var (
		mu       sync.Mutex
		requests []recordedRequest
	)
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		body, _ := io.ReadAll(r.Body)
		mu.Lock()
		requests = append(requests, recordedRequest{r.Method, r.URL.Path, r.Header.Get("Content-Type"), string(body)})
		mu.Unlock()
		w.WriteHeader(status)
	}))
	t.Cleanup(server.Close)
	return server, func() []recordedRequest {
		mu.Lock()
		defer mu.Unlock()
		return append([]recordedRequest(nil), requests...)
	}
}

func newTestStore(t *testing.T, endpoint string, prefix string) *S3Store {
	t.Helper()
	t.Setenv("AWS_ACCESS_KEY_ID", "test")
	t.Setenv("AWS_SECRET_ACCESS_KEY", "test")
	store, err := NewS3Store(&config.Config{
		S3Bucket:         "shares",
		S3Region:         "us-east-1",
		S3Endpoint:       endpoint,
		S3Prefix:         prefix,
		S3ForcePathStyle: true,
	})
	require.NoError(t, err)
	return store
}

func TestPutWritesUnderPrefix(t *testing.T) {
	server, requests := fakeS3(t, http.StatusOK)
	store := newTestStore(t, server.URL, "uploads")

	err := store.Put(context.Background(), "2026-11-08/host/120000.000Z/rules/a.yml", []byte("groups: []"), "application/yaml")

	require.NoError(t, err)
	got := requests()
	require.Len(t, got, 1)
	assert.Equal(t, http.MethodPut, got[0].method)
	assert.Equal(t, "/shares/uploads/2026-11-08/host/120000.000Z/rules/a.yml", got[0].path)
	assert.Equal(t, "application/yaml", got[0].contentType)
	// Over plain HTTP, minio-go signs the payload with aws-chunked streaming,
	// so the raw body holds chunk signatures around the content.
	assert.Contains(t, got[0].body, "groups: []")
}

func TestPutReturnsErrorOnFailure(t *testing.T) {
	server, _ := fakeS3(t, http.StatusForbidden)
	store := newTestStore(t, server.URL, "")

	err := store.Put(context.Background(), "k.yml", []byte("x"), "application/yaml")

	require.Error(t, err)
	assert.Contains(t, err.Error(), "put object")
}

func TestNewS3StoreRejectsInvalidEndpoints(t *testing.T) {
	for _, endpoint := range []string{"", "minio:9000", "ftp://minio:9000", "://bad"} {
		t.Run(endpoint, func(t *testing.T) {
			_, err := NewS3Store(&config.Config{S3Bucket: "shares", S3Endpoint: endpoint})

			require.Error(t, err)
		})
	}
}
