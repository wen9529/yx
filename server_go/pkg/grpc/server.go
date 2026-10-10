package grpc

import (
	"context"
	"fmt"
	"log"
	"net"

	"github.com/gamehall/monolith/pkg/matchmaker"
	"github.com/gamehall/monolith/pkg/settlement"
)

// MonolithGrpcServer ties together cross-game services in the monolith
type MonolithGrpcServer struct {
	listener   net.Listener
	matchmaker *matchmaker.MatchmakingPool
	settlement *settlement.SettlementEngine
	port       int
}

func NewMonolithGrpcServer(port int, mm *matchmaker.MatchmakingPool, st *settlement.SettlementEngine) *MonolithGrpcServer {
	return &MonolithGrpcServer{
		matchmaker: mm,
		settlement: st,
		port:       port,
	}
}

func (s *MonolithGrpcServer) Start() error {
	addr := fmt.Sprintf("0.0.0.0:%d", s.port)
	lis, err := net.Listen("tcp", addr)
	if err != nil {
		return fmt.Errorf("failed to listen on RPC port %d: %w", s.port, err)
	}
	s.listener = lis

	log.Printf("[RPC Mesh] Internal Game Micro-Service Hub listening on %s (Zero-dependency TCP/RPC)", addr)
	go func() {
		for {
			conn, err := lis.Accept()
			if err != nil {
				return
			}
			go func(c net.Conn) {
				defer c.Close()
				// Internal keepalive ping/pong
				buf := make([]byte, 128)
				_, _ = c.Read(buf)
				_, _ = c.Write([]byte("PONG\n"))
			}(conn)
		}
	}()
	return nil
}

func (s *MonolithGrpcServer) Stop(ctx context.Context) {
	log.Printf("[RPC Mesh] Gracefully stopping RPC server...")
	if s.listener != nil {
		_ = s.listener.Close()
	}
}
