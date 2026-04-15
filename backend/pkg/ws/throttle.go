package ws

import (
	"sync"
	"time"
)

// Simple per-user rate limiter: allow N events per window.
type Throttler struct {
	mu      sync.Mutex
	limit   int
	window  time.Duration
	records map[string][]time.Time
}

func NewThrottler(limit int, window time.Duration) *Throttler {
	return &Throttler{
		limit:   limit,
		window:  window,
		records: make(map[string][]time.Time),
	}
}

func (t *Throttler) Allow(userID string) bool {
	now := time.Now()

	t.mu.Lock()
	defer t.mu.Unlock()

	h := t.records[userID]
	// keep only timestamps within window
	cut := now.Add(-t.window)
	n := 0
	for _, ts := range h {
		if ts.After(cut) {
			h[n] = ts
			n++
		}
	}
	h = h[:n]

	if len(h) >= t.limit {
		t.records[userID] = h
		return false
	}

	h = append(h, now)
	t.records[userID] = h
	return true
}
