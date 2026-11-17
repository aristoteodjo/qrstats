package service

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"sync"
	"testing"
	"time"

	"golang.org/x/crypto/bcrypt"

	"qrstats/internal/model"
)

type memoryStore struct {
	mu    sync.Mutex
	codes map[string]model.QRCode
}

func newMemoryStore() *memoryStore { return &memoryStore{codes: map[string]model.QRCode{}} }

func (m *memoryStore) Create(_ context.Context, qr *model.QRCode) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	for _, c := range m.codes {
		if c.Slug == qr.Slug {
			return ErrSlugTaken
		}
	}
	m.codes[qr.ID] = *qr
	return nil
}

func (m *memoryStore) Get(_ context.Context, owner, id string) (*model.QRCode, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	c, ok := m.codes[id]
	if !ok || c.OwnerSubject != owner {
		return nil, ErrNotFound
	}
	return &c, nil
}

func (m *memoryStore) BySlug(_ context.Context, slug string) (*model.QRCode, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	for _, c := range m.codes {
		if c.Slug == slug {
			return &c, nil
		}
	}
	return nil, ErrNotFound
}

func (m *memoryStore) List(_ context.Context, owner string, _ ListFilter) ([]QRSummary, int64, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	var out []QRSummary
	for _, c := range m.codes {
		if c.OwnerSubject == owner {
			out = append(out, QRSummary{QRCode: c})
		}
	}
	return out, int64(len(out)), nil
}

func (m *memoryStore) Update(_ context.Context, qr *model.QRCode) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	if c, ok := m.codes[qr.ID]; !ok || c.OwnerSubject != qr.OwnerSubject {
		return ErrNotFound
	}
	m.codes[qr.ID] = *qr
	return nil
}

func (m *memoryStore) Delete(_ context.Context, owner, id string) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	if c, ok := m.codes[id]; !ok || c.OwnerSubject != owner {
		return ErrNotFound
	}
	delete(m.codes, id)
	return nil
}

func (m *memoryStore) RecordUnlockFailure(_ context.Context, id string, now time.Time, window time.Duration) (int, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	c := m.codes[id]
	if c.UnlockWindowStart == nil || now.Sub(*c.UnlockWindowStart) >= window {
		c.UnlockWindowStart, c.UnlockFailures = &now, 0
	}
	c.UnlockFailures++
	m.codes[id] = c
	return c.UnlockFailures, nil
}

func newTestService() *QRCodes {
	s := NewQRCodes(newMemoryStore(), func() time.Time { return time.Date(2026, 11, 18, 0, 0, 0, 0, time.UTC) })
	s.bcryptCost = bcrypt.MinCost
	return s
}

func link(target string) json.RawMessage { return json.RawMessage(`{"url":"` + target + `"}`) }

func TestOwnersAreIsolated(t *testing.T) {
	ctx := context.Background()
	s := newTestService()
	qr, err := s.Create(ctx, "alice", CreateInput{Kind: KindURL, Content: link("example.com")})
	if err != nil {
		t.Fatal(err)
	}
	if _, err := s.Get(ctx, "bob", qr.ID); !errors.Is(err, ErrNotFound) {
		t.Fatalf("bob reads alice's code: %v", err)
	}
	name := "pris"
	if _, err := s.Update(ctx, "bob", qr.ID, PatchInput{Name: &name}); !errors.Is(err, ErrNotFound) {
		t.Fatalf("bob updates alice's code: %v", err)
	}
	if err := s.Delete(ctx, "bob", qr.ID); !errors.Is(err, ErrNotFound) {
		t.Fatalf("bob deletes alice's code: %v", err)
	}
	if list, _, _ := s.List(ctx, "bob", ListFilter{}); len(list) != 0 {
		t.Fatalf("bob lists alice's code: %v", list)
	}
}

func TestTargetChangesButSlugStays(t *testing.T) {
	ctx := context.Background()
	s := newTestService()
	qr, _ := s.Create(ctx, "alice", CreateInput{Kind: KindURL, Content: link("a.example.com")})
	slug := qr.Slug

	text := KindText
	updated, err := s.Update(ctx, "alice", qr.ID, PatchInput{Kind: &text, Content: json.RawMessage(`{"text":"Menu du jour"}`)})
	if err != nil {
		t.Fatal(err)
	}
	if updated.Slug != slug || updated.Kind != KindText {
		t.Fatalf("slug %q -> %q, kind %q", slug, updated.Slug, updated.Kind)
	}
	if updated.Name != "Lien" {
		t.Fatalf("name must stay the one given at creation, got %q", updated.Name)
	}

	url := KindURL
	if _, err := s.Update(ctx, "alice", qr.ID, PatchInput{Kind: &url}); err == nil {
		t.Fatal("changing kind without content must fail")
	}
	wifi := KindWifi
	if _, err := s.Update(ctx, "alice", qr.ID, PatchInput{Kind: &wifi, Content: json.RawMessage(`{"ssid":"x","encryption":"nopass"}`)}); err == nil {
		t.Fatal("a dynamic code cannot become a Wi-Fi code")
	}
}

func TestPasswordLockAndUnlock(t *testing.T) {
	ctx := context.Background()
	s := newTestService()
	qr, err := s.Create(ctx, "alice", CreateInput{Kind: KindURL, Content: link("example.com"), Password: "sesame"})
	if err != nil {
		t.Fatal(err)
	}
	view := PublicView(qr)
	if !view.Locked || view.Content != nil {
		t.Fatalf("a locked code must not leak its content: %+v", view)
	}
	if _, err := s.Unlock(ctx, qr.Slug, "wrong", "ip"); !errors.Is(err, ErrWrongPassword) {
		t.Fatalf("wrong password: %v", err)
	}
	opened, err := s.Unlock(ctx, qr.Slug, "sesame", "ip")
	if err != nil || opened.Content == nil || opened.Locked {
		t.Fatalf("unlock: %+v %v", opened, err)
	}
	for i := 0; i < 10; i++ {
		_, _ = s.Unlock(ctx, qr.Slug, "wrong", "attacker")
	}
	if _, err := s.Unlock(ctx, qr.Slug, "sesame", "attacker"); !errors.Is(err, ErrTooManyTries) {
		t.Fatalf("attempts must be bounded: %v", err)
	}

	// The per-code cap holds even when every guess comes from a different address.
	for i := 0; i < UnlockMaxFailures; i++ {
		_, _ = s.Unlock(ctx, qr.Slug, "wrong", fmt.Sprintf("ip-%d", i))
	}
	if _, err := s.Unlock(ctx, qr.Slug, "sesame", "fresh-ip"); !errors.Is(err, ErrTooManyTries) {
		t.Fatalf("rotating addresses must not bypass the per-code cap: %v", err)
	}

	empty := ""
	updated, _ := s.Update(ctx, "alice", qr.ID, PatchInput{Password: &empty})
	if PublicView(updated).Locked {
		t.Fatal("an empty password removes the lock")
	}
	if _, err := s.Create(ctx, "alice", CreateInput{Kind: KindWifi, Content: json.RawMessage(`{"ssid":"x","encryption":"nopass"}`), Password: "abcdef"}); err == nil {
		t.Fatal("a Wi-Fi code cannot be locked")
	}
}

func TestPausedCodeHidesContent(t *testing.T) {
	ctx := context.Background()
	s := newTestService()
	qr, _ := s.Create(ctx, "alice", CreateInput{Kind: KindURL, Content: link("example.com")})
	paused := model.StatusPaused
	qr, _ = s.Update(ctx, "alice", qr.ID, PatchInput{Status: &paused})
	if PublicView(qr).Content != nil {
		t.Fatal("a paused code must not reveal its content")
	}
	if _, err := s.Unlock(ctx, qr.Slug, "", "ip"); !errors.Is(err, ErrPaused) {
		t.Fatalf("unlock on paused: %v", err)
	}
	if _, err := s.Resolve(ctx, "../../x"); !errors.Is(err, ErrNotFound) {
		t.Fatal("an invalid slug never reaches the store")
	}
}
