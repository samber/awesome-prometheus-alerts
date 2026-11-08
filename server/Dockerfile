# Production image of the share server.
# Build from this directory: docker build -t awesome-prometheus-alerts-share-server server/
FROM golang:1.27.3-trixie AS build

WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /out/share-server ./cmd/share-server

FROM gcr.io/distroless/static-debian13:nonroot

COPY --from=build /out/share-server /usr/local/bin/share-server
ENV LISTEN_ADDR=:4242
EXPOSE 4242
USER nonroot:nonroot
ENTRYPOINT ["/usr/local/bin/share-server"]
