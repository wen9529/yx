.PHONY: all build run test proto docker-build bench

all: build

proto:
	@echo "Generating protobuf Go bindings..."
	protoc --go_out=. --go_opt=paths=source_relative \
	       --go-grpc_out=. --go-grpc_opt=paths=source_relative \
	       proto/game.proto

build:
	@echo "Building Go Monolith binary..."
	go build -o bin/gamehall-monolith ./main.go

run:
	@echo "Running Game Hall Monolith..."
	go run ./main.go

test:
	@echo "Running unit tests for all game engines..."
	go test -v ./pkg/engine/... ./pkg/matchmaker/... ./pkg/settlement/...

bench:
	@echo "Running high-concurrency benchmarks..."
	go test -bench=. -benchmem ./pkg/...

docker-build:
	docker build -t gamehall-monolith:latest .
