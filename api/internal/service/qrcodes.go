package service

import (
	"context"
	"encoding/json"
	"errors"
	"strings"
	"time"

	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"

	"qrstats/internal/model"
)

var ErrSlugTaken = errors.New("slug taken")

type ListFilter struct {
	Search  string
	Status  string
	Page    int
	PerPage int
}

// QRSummary is a list row: the code and its lifetime scan count.
type QRSummary struct {
	model.QRCode
	Scans      int64      `json:"scans"`
	LastScanAt *time.Time `json:"last_scan_at"`
}

type QRStore interface {
	Create(ctx context.Context, qr *model.QRCode) error
	Get(ctx context.Context, owner, id string) (*model.QRCode, error)
	BySlug(ctx context.Context, slug string) (*model.QRCode, error)
	List(ctx context.Context, owner string, filter ListFilter) ([]QRSummary, int64, error)
	Update(ctx context.Context, qr *model.QRCode) error
	Delete(ctx context.Context, owner, id string) error
}

type QRCodes struct {
	store QRStore
	now   func() time.Time
	// bcryptCost is lowered in tests only.
	bcryptCost int
	unlocks    *Limiter
}

func NewQRCodes(store QRStore, now func() time.Time) *QRCodes {
	if now == nil {
		now = time.Now
	}
	return &QRCodes{store: store, now: now, bcryptCost: bcrypt.DefaultCost, unlocks: NewLimiter(10, 10*time.Minute, now)}
}

type CreateInput struct {
	Name     string          `json:"name"`
	Kind     string          `json:"kind"`
	Content  json.RawMessage `json:"content" swaggertype:"object"`
	Design   json.RawMessage `json:"design" swaggertype:"object"`
	Password string          `json:"password"`
}

func (s *QRCodes) Create(ctx context.Context, owner string, in CreateInput) (*model.QRCode, error) {
	if !ValidKind(in.Kind) {
		return nil, invalid("kind", "Type de QR code inconnu.")
	}
	content, err := NormalizeContent(in.Kind, in.Content)
	if err != nil {
		return nil, err
	}
	design, err := NormalizeDesign(in.Design)
	if err != nil {
		return nil, err
	}
	name, err := NormalizeName(in.Name, in.Kind)
	if err != nil {
		return nil, err
	}
	hash, err := s.passwordHash(in.Kind, in.Password)
	if err != nil {
		return nil, err
	}
	now := s.now().UTC()
	qr := &model.QRCode{
		OwnerSubject: owner, Name: name, Kind: in.Kind, Content: content, Design: design,
		Status: model.StatusActive, PasswordHash: hash, CreatedAt: now, UpdatedAt: now,
	}
	// A collision among 55^7 slugs is rare; a few retries make it vanishingly so.
	for attempt := 0; attempt < 5; attempt++ {
		id, err := uuid.NewV7()
		if err != nil {
			return nil, err
		}
		slug, err := NewSlug()
		if err != nil {
			return nil, err
		}
		qr.ID, qr.Slug = id.String(), slug
		err = s.store.Create(ctx, qr)
		if errors.Is(err, ErrSlugTaken) {
			continue
		}
		return qr, err
	}
	return nil, ErrSlugTaken
}

type PatchInput struct {
	Name    *string         `json:"name"`
	Kind    *string         `json:"kind"`
	Content json.RawMessage `json:"content" swaggertype:"object"`
	Design  json.RawMessage `json:"design" swaggertype:"object"`
	Status  *string         `json:"status"`
	// Password: absent keeps it, "" removes it, anything else replaces it.
	Password *string `json:"password"`
}

// Update changes what the printed code leads to. The slug never changes: it is what the paper says.
func (s *QRCodes) Update(ctx context.Context, owner, id string, in PatchInput) (*model.QRCode, error) {
	qr, err := s.store.Get(ctx, owner, id)
	if err != nil {
		return nil, err
	}
	kind := qr.Kind
	if in.Kind != nil && *in.Kind != qr.Kind {
		if !ValidKind(*in.Kind) {
			return nil, invalid("kind", "Type de QR code inconnu.")
		}
		// A Wi-Fi code holds its network in the printed pattern itself: it can neither become nor stop being one.
		if !IsDynamic(*in.Kind) || !IsDynamic(qr.Kind) {
			return nil, invalid("kind", "Un QR code Wi-Fi ne peut pas changer de type.")
		}
		if len(in.Content) == 0 {
			return nil, invalid("content", "Le contenu du nouveau type est obligatoire.")
		}
		kind = *in.Kind
	}
	if len(in.Content) > 0 {
		content, err := NormalizeContent(kind, in.Content)
		if err != nil {
			return nil, err
		}
		qr.Content = content
	}
	qr.Kind = kind
	if len(in.Design) > 0 {
		design, err := NormalizeDesign(in.Design)
		if err != nil {
			return nil, err
		}
		qr.Design = design
	}
	if in.Name != nil {
		name, err := NormalizeName(*in.Name, kind)
		if err != nil {
			return nil, err
		}
		qr.Name = name
	}
	if in.Status != nil {
		if *in.Status != model.StatusActive && *in.Status != model.StatusPaused {
			return nil, invalid("status", "Statut inconnu.")
		}
		if !IsDynamic(kind) && *in.Status == model.StatusPaused {
			return nil, invalid("status", "Un QR code Wi-Fi ne peut pas être mis en pause.")
		}
		qr.Status = *in.Status
	}
	if in.Password != nil {
		hash, err := s.passwordHash(kind, *in.Password)
		if err != nil {
			return nil, err
		}
		qr.PasswordHash = hash
	}
	qr.UpdatedAt = s.now().UTC()
	if err := s.store.Update(ctx, qr); err != nil {
		return nil, err
	}
	return qr, nil
}

func (s *QRCodes) passwordHash(kind, password string) (string, error) {
	if password == "" {
		return "", nil
	}
	if !IsDynamic(kind) {
		return "", invalid("password", "Un QR code Wi-Fi ne peut pas être protégé par mot de passe.")
	}
	if err := ValidatePassword(password); err != nil {
		return "", err
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(password), s.bcryptCost)
	return string(hash), err
}

func (s *QRCodes) Get(ctx context.Context, owner, id string) (*model.QRCode, error) {
	return s.store.Get(ctx, owner, id)
}

func (s *QRCodes) List(ctx context.Context, owner string, filter ListFilter) ([]QRSummary, int64, error) {
	filter.Search = clip(filter.Search, 100)
	if filter.Status != model.StatusActive && filter.Status != model.StatusPaused {
		filter.Status = ""
	}
	return s.store.List(ctx, owner, filter)
}

func (s *QRCodes) Delete(ctx context.Context, owner, id string) error {
	return s.store.Delete(ctx, owner, id)
}

// Public is what a scanner may learn about a code before unlocking it.
type Public struct {
	Kind    string          `json:"kind"`
	Name    string          `json:"name"`
	Status  string          `json:"status"`
	Locked  bool            `json:"locked"`
	Content json.RawMessage `json:"content,omitempty" swaggertype:"object"`
}

// Resolve finds a code by its printed slug, for the redirect and the landing page.
func (s *QRCodes) Resolve(ctx context.Context, slug string) (*model.QRCode, error) {
	if !ValidSlug(slug) {
		return nil, ErrNotFound
	}
	return s.store.BySlug(ctx, slug)
}

// PublicView hides the content of a paused or locked code.
func PublicView(qr *model.QRCode) Public {
	view := Public{Kind: qr.Kind, Name: qr.Name, Status: qr.Status, Locked: qr.PasswordHash != ""}
	if qr.Status == model.StatusActive && !view.Locked {
		view.Content = qr.Content
	}
	return view
}

// Unlock checks a code's password. attemptKey (IP and slug) bounds guesses per window.
func (s *QRCodes) Unlock(ctx context.Context, slug, password, attemptKey string) (Public, error) {
	qr, err := s.Resolve(ctx, slug)
	if err != nil {
		return Public{}, err
	}
	if qr.Status != model.StatusActive {
		return Public{}, ErrPaused
	}
	view := PublicView(qr)
	if !view.Locked {
		return view, nil
	}
	if !s.unlocks.Allow(attemptKey + "|" + slug) {
		return Public{}, ErrTooManyTries
	}
	if bcrypt.CompareHashAndPassword([]byte(qr.PasswordHash), []byte(strings.TrimSpace(password))) != nil {
		return Public{}, ErrWrongPassword
	}
	view.Locked = false
	view.Content = qr.Content
	return view, nil
}
