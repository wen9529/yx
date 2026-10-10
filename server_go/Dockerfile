# Multi-stage Docker build for Go Game Hall Monolith
FROM golang:1.22-alpine AS builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache git protobuf-dev

COPY go.mod go.sum* ./
RUN go mod download

COPY . .

# Build static binary
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o gamehall-monolith ./main.go

# Minimal runtime image
FROM alpine:3.19

RUN apk add --no-cache ca-certificates tzdata
WORKDIR /app

COPY --from=builder /app/gamehall-monolith /app/gamehall-monolith

EXPOSE 8080 50051

ENTRYPOINT ["/app/gamehall-monolith"]
