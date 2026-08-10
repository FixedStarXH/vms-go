package cache

import (
	"context"
	"time"

	"github.com/redis/go-redis/v9"
)

// RedisCache 封装 go-redis，所有方法错误均上抛，由业务层决定降级策略
type RedisCache struct {
	client *redis.Client
}

func New(addr, password string, db int) (*RedisCache, error) {
	client := redis.NewClient(&redis.Options{
		Addr:     addr,
		Password: password,
		DB:       db,
	})
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()
	if err := client.Ping(ctx).Err(); err != nil {
		return nil, err
	}
	return &RedisCache{client: client}, nil
}

func (r *RedisCache) Client() *redis.Client { return r.client }

// Exists key 是否存在
func (r *RedisCache) Exists(key string) (bool, error) {
	n, err := r.client.Exists(context.Background(), key).Result()
	return n > 0, err
}

// SetNX 不存在则设置（幂等/防重复提交）
func (r *RedisCache) SetNX(key string, value any, ttl time.Duration) (bool, error) {
	return r.client.SetNX(context.Background(), key, value, ttl).Result()
}

// Set 设置带过期时间的值
func (r *RedisCache) Set(key string, value any, ttl time.Duration) error {
	return r.client.Set(context.Background(), key, value, ttl).Err()
}

// Get 取值
func (r *RedisCache) Get(key string) (string, error) {
	return r.client.Get(context.Background(), key).Result()
}

// Incr 自增
func (r *RedisCache) Incr(key string) (int64, error) {
	return r.client.Incr(context.Background(), key).Result()
}

// Decr 自减
func (r *RedisCache) Decr(key string) (int64, error) {
	return r.client.Decr(context.Background(), key).Result()
}

// Eval 执行 Lua 脚本（原子操作）
func (r *RedisCache) Eval(script string, keys []string, args ...any) (any, error) {
	return r.client.Eval(context.Background(), script, keys, args...).Result()
}

// TTL 剩余过期时间
func (r *RedisCache) TTL(key string) (time.Duration, error) {
	return r.client.TTL(context.Background(), key).Result()
}

// Del 删除 key
func (r *RedisCache) Del(keys ...string) error {
	return r.client.Del(context.Background(), keys...).Err()
}
