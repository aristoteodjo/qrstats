package service

import (
	"sync"
	"time"
)

// Limiter counts attempts per key in a fixed window. In memory: on a serverless deployment each instance keeps its
// own count, which still slows a brute force down, and bcrypt does the rest.
type Limiter struct {
	mu     sync.Mutex
	max    int
	window time.Duration
	now    func() time.Time
	hits   map[string]window
}

type window struct {
	start time.Time
	count int
}

func NewLimiter(max int, per time.Duration, now func() time.Time) *Limiter {
	if now == nil {
		now = time.Now
	}
	return &Limiter{max: max, window: per, now: now, hits: map[string]window{}}
}

// Allow records one attempt and says whether it is within the limit.
func (l *Limiter) Allow(key string) bool {
	l.mu.Lock()
	defer l.mu.Unlock()
	now := l.now()
	if len(l.hits) > 10_000 {
		for k, w := range l.hits {
			if now.Sub(w.start) >= l.window {
				delete(l.hits, k)
			}
		}
	}
	w := l.hits[key]
	if now.Sub(w.start) >= l.window {
		w = window{start: now}
	}
	w.count++
	l.hits[key] = w
	return w.count <= l.max
}
