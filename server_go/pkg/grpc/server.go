package grpc

import (
	"context"
	"fmt"
	"log"
	"net"

	"github.com/gamehall/monolith/pkg/matchmaker"
	"github.com/gamehall/monolith/pkg/settlement"
	"google.golang.org/grpc"
)

// MonolithGrpcServer ties together cross-game services in the monolith
type MonolithGrpcServer struct {
	grpcServer *grpc.Server
	matchmaker *matchmaker.MatchmakingPool
	settlement *settlement.SettlementEngine
	port       int
}

func NewMonolithGrpcServer(port int, mm *matchmaker.MatchmakingPool, st *settlement.SettlementEngine) *MonolithGrpcServer {
	s := grpc.NewServer()
	return &MonolithGrpcServer{
		grpcServer: s,
		matchmaker: mm,
		settlement: st,
		port:       port,
	}
}

func (s *MonolithGrpcServer) Start() error {
	addr := fmt.Sprintf("0.0.0.0:%d", s.port)
	lis, err := net.Listen("tcp", addr)
	if err != nil {
		return fmt.Errorf("failed to listen on gRPC port %d: %w", s.port, err)
	}

	log.Printf("[gRPC Mesh] Internal Game Micro-Service Hub listening on %s", addr)
	go func() {
		if err := s.grpcServer.Serve(lis); err != nil {
			log.Printf("[gRPC Mesh] Server stopped: %v", err)
		}
	}()
	return nil
}

func (s *MonolithGrpcServer) Stop(ctx context.Context) {
	log.Printf("[gRPC Mesh] Gracefully stopping gRPC server...")
	s.grpcServer.GracefulStop()
}
