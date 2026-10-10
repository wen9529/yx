package redissync

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/redis/go-redis/v9"
)

// RedisSyncManager manages atomic distributed state & Pub/Sub
type RedisSyncManager struct {
	client     *redis.Client
	lockScript *redis.Script
	playScript *redis.Script
}

const (
	// Lua script: Acquire distributed room lock atomically with TTL
	luaAcquireLock = `
		if redis.call("set", KEYS[1], ARGV[1], "NX", "PX", ARGV[2]) then
			return 1
		else
			return 0
		end
	`

	// Lua script: Atomic turn check and discard card update
	luaAtomicPlay = `
		local currentTurn = redis.call("HGET", KEYS[1], "current_turn_user")
		if currentTurn ~= ARGV[1] then
			return {0, "not your turn"}
		end
		redis.call("HSET", KEYS[1], "last_action_user", ARGV[1])
		redis.call("HSET", KEYS[1], "last_hand_payload", ARGV[2])
		redis.call("HSET", KEYS[1], "current_turn_user", ARGV[3])
		redis.call("EXPIRE", KEYS[1], 1800)
		return {1, "ok"}
	`
)

func NewRedisSyncManager(addr, password string, db int) *RedisSyncManager {
	rdb := redis.NewClient(&redis.Options{
		Addr:         addr,
		Password:     password,
		DB:           db,
		PoolSize:     200, // High-concurrency connection pool
		MinIdleConns: 50,
	})

	return &RedisSyncManager{
		client:     rdb,
		lockScript: redis.NewScript(luaAcquireLock),
		playScript: redis.NewScript(luaAtomicPlay),
	}
}

// LockRoom acquires a spin/mutex lock for 2 seconds to serialize concurrent operations
func (m *RedisSyncManager) LockRoom(ctx context.Context, roomID, token string, ttlMs int64) (bool, error) {
	key := fmt.Sprintf("lock:room:%s", roomID)
	res, err := m.lockScript.Run(ctx, m.client, []string{key}, token, ttlMs).Int()
	if err != nil {
		return false, err
	}
	return res == 1, nil
}

// UnlockRoom safely releases the lock
func (m *RedisSyncManager) UnlockRoom(ctx context.Context, roomID, token string) error {
	key := fmt.Sprintf("lock:room:%s", roomID)
	// Only unlock if holding token
	luaUnlock := `
		if redis.call("get", KEYS[1]) == ARGV[1] then
			return redis.call("del", KEYS[1])
		else
			return 0
		end
	`
	return redis.NewScript(luaUnlock).Run(ctx, m.client, []string{key}, token).Err()
}

// SaveRoomSnapshot saves room state Hash into Redis with 30m TTL
func (m *RedisSyncManager) SaveRoomSnapshot(ctx context.Context, roomID string, state map[string]interface{}) error {
	key := fmt.Sprintf("room:%s:state", roomID)
	pipe := m.client.Pipeline()
	pipe.HSet(ctx, key, state)
	pipe.Expire(ctx, key, 30*time.Minute)
	_, err := pipe.Exec(ctx)
	return err
}

// PublishRoomEvent broadcasts event to room pubsub channel
func (m *RedisSyncManager) PublishRoomEvent(ctx context.Context, roomID, eventName string, payload interface{}) error {
	channel := fmt.Sprintf("channel:room:%s", roomID)
	data, err := json.Marshal(map[string]interface{}{
		"event":     eventName,
		"payload":   payload,
		"timestamp": time.Now().UnixMilli(),
	})
	if err != nil {
		return err
	}
	return m.client.Publish(ctx, channel, data).Err()
}

// UpdateWalletAtomic updates player coins atomically
func (m *RedisSyncManager) UpdateWalletAtomic(ctx context.Context, userID string, delta int64) (int64, error) {
	key := fmt.Sprintf("wallet:%s:coins", userID)
	return m.client.IncrBy(ctx, key, delta).Result()
}
