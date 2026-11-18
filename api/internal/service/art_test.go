package service

import (
	"context"
	"errors"
	"strings"
	"sync"
	"testing"
	"time"

	"qrstats/internal/model"
)

type memoryArt struct {
	mu   sync.Mutex
	jobs map[string]model.ArtJob
}

func (m *memoryArt) count(owner string, since time.Time) int {
	n := 0
	for _, j := range m.jobs {
		if j.OwnerSubject == owner && j.CreatedAt.After(since) && j.Status != model.ArtFailed {
			n++
		}
	}
	return n
}

func (m *memoryArt) Reserve(_ context.Context, job *model.ArtJob, since time.Time, limit int) (int, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	used := m.count(job.OwnerSubject, since)
	if used >= limit {
		return 0, ErrArtQuota
	}
	m.jobs[job.ID] = *job
	return used + 1, nil
}

func (m *memoryArt) Used(_ context.Context, owner string, since time.Time) (int, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	return m.count(owner, since), nil
}

func (m *memoryArt) Get(_ context.Context, owner, id string) (*model.ArtJob, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	j, ok := m.jobs[id]
	if !ok || j.OwnerSubject != owner {
		return nil, ErrNotFound
	}
	return &j, nil
}

func (m *memoryArt) SetPrediction(_ context.Context, id, p string) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	j := m.jobs[id]
	j.PredictionID = p
	m.jobs[id] = j
	return nil
}

func (m *memoryArt) SetStatus(_ context.Context, id, s string) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	j := m.jobs[id]
	j.Status = s
	m.jobs[id] = j
	return nil
}

type fakePainter struct {
	input    map[string]any
	startErr error
	status   string
}

func (f *fakePainter) Start(_ context.Context, input map[string]any) (string, error) {
	f.input = input
	return "pred-1", f.startErr
}

func (f *fakePainter) Poll(context.Context, string) (Prediction, error) {
	return Prediction{Status: f.status, Output: []string{"https://replicate.delivery/x/out-0.png"}}, nil
}

func (f *fakePainter) Fetch(context.Context, string) ([]byte, string, error) {
	return []byte("png"), "image/png", nil
}

func artFixture(t *testing.T, painter Painter, limit int) (*Art, *model.QRCode, *model.QRCode) {
	codes := newMemoryStore()
	svc := NewQRCodes(codes, nil)
	ctx := context.Background()
	link, err := svc.Create(ctx, "alice", CreateInput{Name: "a", Kind: "url", Content: []byte(`{"url":"https://example.com"}`)})
	if err != nil {
		t.Fatal(err)
	}
	wifi, err := svc.Create(ctx, "alice", CreateInput{Name: "w", Kind: "wifi", Content: []byte(`{"ssid":"home","password":"secret123","encryption":"WPA"}`)})
	if err != nil {
		t.Fatal(err)
	}
	return NewArt(codes, &memoryArt{jobs: map[string]model.ArtJob{}}, painter, "https://go.example/", limit, nil), link, wifi
}

func TestArtEncodesTheShortLinkAndCountsTheQuota(t *testing.T) {
	painter := &fakePainter{status: "processing"}
	art, link, wifi := artFixture(t, painter, 2)
	ctx := context.Background()

	job, quota, err := art.Start(ctx, "alice", link.ID, ArtStartInput{Prompt: "  a  forest  ", Style: "artistic"})
	if err != nil {
		t.Fatal(err)
	}
	if painter.input["qr_code_content"] != "https://go.example/r/"+link.Slug || painter.input["prompt"] != "a forest" {
		t.Fatalf("input: %v", painter.input)
	}
	if painter.input["controlnet_conditioning_scale"] != ArtStyles["artistic"] || quota.Remaining != 1 {
		t.Fatalf("style %v, quota %+v", painter.input["controlnet_conditioning_scale"], quota)
	}

	if _, _, err := art.Start(ctx, "bob", link.ID, ArtStartInput{Prompt: "a forest"}); !errors.Is(err, ErrNotFound) {
		t.Fatalf("other owner: %v", err)
	}
	var v *ValidationError
	if _, _, err := art.Start(ctx, "alice", wifi.ID, ArtStartInput{Prompt: "a forest"}); !errors.As(err, &v) {
		t.Fatalf("wifi: %v", err)
	}
	if _, _, err := art.Start(ctx, "alice", link.ID, ArtStartInput{Prompt: "ab"}); !errors.As(err, &v) || v.Field != "prompt" {
		t.Fatalf("short prompt: %v", err)
	}

	pending, err := art.Result(ctx, "alice", job.ID)
	if err != nil || pending.Status != model.ArtPending || pending.Image != "" {
		t.Fatalf("pending: %+v %v", pending, err)
	}
	if _, err := art.Result(ctx, "bob", job.ID); !errors.Is(err, ErrNotFound) {
		t.Fatalf("other owner result: %v", err)
	}

	painter.status = "succeeded"
	done, err := art.Result(ctx, "alice", job.ID)
	if err != nil || done.Status != model.ArtSucceeded || !strings.HasPrefix(done.Image, "data:image/png;base64,") {
		t.Fatalf("done: %+v %v", done, err)
	}

	if _, _, err := art.Start(ctx, "alice", link.ID, ArtStartInput{Prompt: "a lake"}); err != nil {
		t.Fatal(err)
	}
	if _, _, err := art.Start(ctx, "alice", link.ID, ArtStartInput{Prompt: "a lake"}); !errors.Is(err, ErrArtQuota) {
		t.Fatalf("third artwork: %v", err)
	}
}

func TestArtFailuresGiveTheSlotBack(t *testing.T) {
	painter := &fakePainter{startErr: errors.New("down")}
	art, link, _ := artFixture(t, painter, 1)
	ctx := context.Background()
	if _, _, err := art.Start(ctx, "alice", link.ID, ArtStartInput{Prompt: "a forest"}); !errors.Is(err, ErrArtProvider) {
		t.Fatalf("provider down: %v", err)
	}
	painter.startErr, painter.status = nil, "failed"
	job, _, err := art.Start(ctx, "alice", link.ID, ArtStartInput{Prompt: "a forest"})
	if err != nil {
		t.Fatalf("slot not given back: %v", err)
	}
	if res, _ := art.Result(ctx, "alice", job.ID); res.Status != model.ArtFailed {
		t.Fatalf("failed: %+v", res)
	}
	if quota, _ := art.Quota(ctx, "alice"); quota.Remaining != 1 {
		t.Fatalf("quota after failure: %+v", quota)
	}
}

func TestArtWithoutTokenIsUnavailable(t *testing.T) {
	art, link, _ := artFixture(t, nil, 10)
	if _, _, err := art.Start(context.Background(), "alice", link.ID, ArtStartInput{Prompt: "a forest"}); !errors.Is(err, ErrArtUnavailable) {
		t.Fatalf("got %v", err)
	}
	if quota, _ := art.Quota(context.Background(), "alice"); quota.Available {
		t.Fatal("quota says available")
	}
}
