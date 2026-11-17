package store

import (
	"context"
	"encoding/json"
	"errors"
	"os"
	"testing"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"qrstats/internal/model"
	"qrstats/internal/platform/database"
	"qrstats/internal/service"
)

// Runs against TEST_DATABASE_URL (a throwaway database); skipped without it.
func testDB(t *testing.T) *gorm.DB {
	dsn := os.Getenv("TEST_DATABASE_URL")
	if dsn == "" {
		t.Skip("TEST_DATABASE_URL not set")
	}
	db, err := database.Open(dsn, false)
	if err != nil {
		t.Fatal(err)
	}
	if err := model.Migrate(db); err != nil {
		t.Fatal(err)
	}
	db.Exec("TRUNCATE scans, qr_codes")
	return db
}

func newCode(t *testing.T, codes *QRCodeStore, owner, slug string) *model.QRCode {
	now := time.Now().UTC()
	qr := &model.QRCode{
		ID: uuid.NewString(), OwnerSubject: owner, Slug: slug, Name: slug, Kind: "url",
		Content: json.RawMessage(`{"url":"https://example.com"}`), Design: json.RawMessage(`{}`),
		Status: model.StatusActive, CreatedAt: now, UpdatedAt: now,
	}
	if err := codes.Create(context.Background(), qr); err != nil {
		t.Fatal(err)
	}
	return qr
}

func TestStoresIsolateOwnersAndAggregate(t *testing.T) {
	db := testDB(t)
	ctx := context.Background()
	codes, scans := NewQRCodeStore(db), NewScanStore(db)

	alice := newCode(t, codes, "alice", "aliceA1")
	bob := newCode(t, codes, "bob", "bobB222")
	if err := codes.Create(ctx, &model.QRCode{ID: uuid.NewString(), OwnerSubject: "x", Slug: "aliceA1", Name: "dup", Kind: "url", Content: json.RawMessage(`{}`), Design: json.RawMessage(`{}`), Status: "active"}); !errors.Is(err, service.ErrSlugTaken) {
		t.Fatalf("duplicate slug: %v", err)
	}

	at := time.Date(2026, 11, 18, 23, 30, 0, 0, time.UTC) // 00:30 on the 19th in Paris
	for i, visitor := range []string{"v1", "v1", "v2"} {
		_ = scans.Insert(ctx, &model.Scan{ID: uuid.NewString(), QRCodeID: alice.ID, At: at.Add(time.Duration(i) * time.Minute), Visitor: visitor, Device: "mobile", OS: "iOS", Browser: "Safari", UTMSource: "flyer"})
	}
	_ = scans.Insert(ctx, &model.Scan{ID: uuid.NewString(), QRCodeID: bob.ID, At: at, Visitor: "v9", Device: "desktop", OS: "Windows", Browser: "Edge"})

	r, err := service.ParseRange("2026-11-19", "2026-11-19", "Europe/Paris", at)
	if err != nil {
		t.Fatal(err)
	}
	rows, err := scans.Stats(ctx, service.StatsQuery{Owner: "alice", Range: r})
	if err != nil {
		t.Fatal(err)
	}
	if rows.Scans != 3 || rows.Uniques != 2 {
		t.Fatalf("alice totals = %d/%d, want 3/2", rows.Scans, rows.Uniques)
	}
	if len(rows.Days) != 1 || rows.Days[0].Date != "2026-11-19" {
		t.Fatalf("days must be read in the reader's zone: %+v", rows.Days)
	}
	if len(rows.Dimensions["device"]) != 1 || rows.Dimensions["device"][0].Key != "mobile" {
		t.Fatalf("bob's scans leaked into alice's breakdown: %+v", rows.Dimensions["device"])
	}
	if len(rows.Hours) != 1 || rows.Hours[0].Key != "0" {
		t.Fatalf("hours = %+v", rows.Hours)
	}
	if len(rows.TopCodes) != 1 || rows.TopCodes[0].ID != alice.ID {
		t.Fatalf("top codes = %+v", rows.TopCodes)
	}

	now := time.Now().UTC()
	for want := 1; want <= 3; want++ {
		if got, err := codes.RecordUnlockFailure(ctx, bob.ID, now, time.Minute); err != nil || got != want {
			t.Fatalf("failure count = %d, %v; want %d", got, err, want)
		}
	}
	if got, _ := codes.RecordUnlockFailure(ctx, bob.ID, now.Add(2*time.Minute), time.Minute); got != 1 {
		t.Fatalf("a new window restarts the count, got %d", got)
	}

	if _, err := codes.Get(ctx, "bob", alice.ID); !errors.Is(err, service.ErrNotFound) {
		t.Fatalf("bob reads alice's code: %v", err)
	}
	list, total, err := codes.List(ctx, "alice", service.ListFilter{Page: 1, PerPage: 25})
	if err != nil || total != 1 || list[0].Scans != 3 {
		t.Fatalf("alice list = %+v (%d) %v", list, total, err)
	}
	for _, sort := range []string{"recent", "oldest", "updated", "name", "scans"} {
		if _, _, err := codes.List(ctx, "alice", service.ListFilter{Page: 1, PerPage: 25, Sort: sort, Kind: "url"}); err != nil {
			t.Fatalf("sort %s: %v", sort, err)
		}
	}
	if err := codes.Delete(ctx, "bob", alice.ID); !errors.Is(err, service.ErrNotFound) {
		t.Fatalf("bob deletes alice's code: %v", err)
	}
	if err := codes.Delete(ctx, "alice", alice.ID); err != nil {
		t.Fatal(err)
	}
	var left int64
	db.Model(&model.Scan{}).Where("qr_code_id = ?", alice.ID).Count(&left)
	if left != 0 {
		t.Fatalf("deleting a code must delete its scans, %d left", left)
	}
}
