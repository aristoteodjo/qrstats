package service

import (
	"context"
	"encoding/base64"
	"errors"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/google/uuid"

	"qrstats/internal/model"
)

var (
	ErrArtUnavailable = errors.New("art generation not configured")
	ErrArtQuota       = errors.New("art daily quota reached")
	ErrArtProvider    = errors.New("art provider failed")
)

const (
	ArtPromptMin = 3
	ArtPromptMax = 400
	ArtWindow    = 24 * time.Hour
	// ArtImageMax bounds what is read back from the provider: a 768 px PNG weighs about 1 MB.
	ArtImageMax = 8 << 20
)

// ArtStyles trade artistry for readability: the ControlNet weight decides how strongly the pattern shows through.
var ArtStyles = map[string]float64{"readable": 2.2, "balanced": 1.8, "artistic": 1.4}

type Prediction struct {
	Status string // starting, processing, succeeded, failed, canceled
	Output []string
	Error  string
}

// Painter is the image provider (Replicate). Behind an interface so the service is tested without the network.
type Painter interface {
	Start(ctx context.Context, input map[string]any) (string, error)
	Poll(ctx context.Context, predictionID string) (Prediction, error)
	Fetch(ctx context.Context, url string) ([]byte, string, error)
}

type ArtStore interface {
	// Reserve inserts the job if the owner has used fewer than limit non-failed jobs since `since`, atomically per
	// owner, and returns the count including it. ErrArtQuota when full.
	Reserve(ctx context.Context, job *model.ArtJob, since time.Time, limit int) (int, error)
	Used(ctx context.Context, owner string, since time.Time) (int, error)
	Get(ctx context.Context, owner, id string) (*model.ArtJob, error)
	SetPrediction(ctx context.Context, id, predictionID string) error
	SetStatus(ctx context.Context, id, status string) error
}

type Art struct {
	codes    QRStore
	store    ArtStore
	painter  Painter
	shortURL string
	limit    int
	now      func() time.Time
}

// NewArt returns a service whose every call answers ErrArtUnavailable when painter is nil (no API token).
func NewArt(codes QRStore, store ArtStore, painter Painter, shortURL string, limit int, now func() time.Time) *Art {
	if now == nil {
		now = time.Now
	}
	return &Art{codes: codes, store: store, painter: painter, shortURL: strings.TrimSuffix(shortURL, "/"), limit: limit, now: now}
}

type ArtStartInput struct {
	Prompt string `json:"prompt"`
	Style  string `json:"style" enums:"readable,balanced,artistic"`
}

type ArtQuota struct {
	Available bool `json:"available"`
	Limit     int  `json:"limit"`
	Used      int  `json:"used"`
	Remaining int  `json:"remaining"`
}

type ArtResult struct {
	ID     string `json:"id"`
	Status string `json:"status"`
	// Image is a data URL, sent once the artwork is ready: the provider deletes its copy after an hour.
	Image string `json:"image,omitempty"`
	Error string `json:"error,omitempty"`
}

// ArtInput is the provider's input for a prompt and the content the code must encode.
func ArtInput(prompt, style, content string) map[string]any {
	weight, ok := ArtStyles[style]
	if !ok {
		weight = ArtStyles["readable"]
	}
	return map[string]any{
		"prompt":                        prompt,
		"qr_code_content":               content,
		"negative_prompt":               "ugly, disfigured, low quality, blurry, nsfw, text, watermark",
		"num_inference_steps":           40,
		"guidance_scale":                7.5,
		"controlnet_conditioning_scale": weight,
		"width":                         768,
		"height":                        768,
		"border":                        1,
		"num_outputs":                   1,
		"qrcode_background":             "gray",
	}
}

func normalizePrompt(raw string) (string, error) {
	prompt := strings.Join(strings.Fields(raw), " ")
	if n := utf8.RuneCountInString(prompt); n < ArtPromptMin || n > ArtPromptMax {
		return "", invalid("prompt", "Décrivez l'image en 3 à 400 caractères.")
	}
	return prompt, nil
}

func (s *Art) Quota(ctx context.Context, owner string) (ArtQuota, error) {
	if s.painter == nil {
		return ArtQuota{Limit: s.limit}, nil
	}
	used, err := s.store.Used(ctx, owner, s.now().Add(-ArtWindow))
	if err != nil {
		return ArtQuota{}, err
	}
	return ArtQuota{Available: true, Limit: s.limit, Used: used, Remaining: max(s.limit-used, 0)}, nil
}

// Start reserves a slot in the owner's daily quota, then asks the provider for an artwork encoding the code's short
// link. The link, never a client-supplied text, is what the artwork encodes: the quota pays for this code only.
func (s *Art) Start(ctx context.Context, owner, codeID string, in ArtStartInput) (*model.ArtJob, ArtQuota, error) {
	if s.painter == nil {
		return nil, ArtQuota{}, ErrArtUnavailable
	}
	prompt, err := normalizePrompt(in.Prompt)
	if err != nil {
		return nil, ArtQuota{}, err
	}
	qr, err := s.codes.Get(ctx, owner, codeID)
	if err != nil {
		return nil, ArtQuota{}, err
	}
	if qr.Kind == "wifi" {
		return nil, ArtQuota{}, invalid("kind", "Le visuel IA est réservé aux codes dynamiques.")
	}
	job := &model.ArtJob{
		ID: uuid.Must(uuid.NewV7()).String(), OwnerSubject: owner, QRCodeID: qr.ID, Prompt: prompt,
		Status: model.ArtPending, CreatedAt: s.now().UTC(),
	}
	used, err := s.store.Reserve(ctx, job, s.now().Add(-ArtWindow), s.limit)
	if err != nil {
		return nil, ArtQuota{}, err
	}
	quota := ArtQuota{Available: true, Limit: s.limit, Used: used, Remaining: max(s.limit-used, 0)}
	predictionID, err := s.painter.Start(ctx, ArtInput(prompt, in.Style, s.shortURL+"/r/"+qr.Slug))
	if err != nil {
		_ = s.store.SetStatus(ctx, job.ID, model.ArtFailed)
		return nil, ArtQuota{}, errors.Join(ErrArtProvider, err)
	}
	if err := s.store.SetPrediction(ctx, job.ID, predictionID); err != nil {
		return nil, ArtQuota{}, err
	}
	job.PredictionID = predictionID
	return job, quota, nil
}

// Result polls the provider; a failed artwork gives its quota slot back.
func (s *Art) Result(ctx context.Context, owner, id string) (ArtResult, error) {
	if s.painter == nil {
		return ArtResult{}, ErrArtUnavailable
	}
	job, err := s.store.Get(ctx, owner, id)
	if err != nil {
		return ArtResult{}, err
	}
	if job.Status == model.ArtFailed || job.PredictionID == "" {
		return ArtResult{ID: job.ID, Status: model.ArtFailed, Error: "La génération a échoué."}, nil
	}
	prediction, err := s.painter.Poll(ctx, job.PredictionID)
	if err != nil {
		return ArtResult{}, errors.Join(ErrArtProvider, err)
	}
	switch prediction.Status {
	case "succeeded":
		if len(prediction.Output) == 0 {
			break
		}
		body, contentType, err := s.painter.Fetch(ctx, prediction.Output[0])
		if err != nil {
			return ArtResult{}, errors.Join(ErrArtProvider, err)
		}
		if job.Status != model.ArtSucceeded {
			_ = s.store.SetStatus(ctx, job.ID, model.ArtSucceeded)
		}
		image := "data:" + contentType + ";base64," + base64.StdEncoding.EncodeToString(body)
		return ArtResult{ID: job.ID, Status: model.ArtSucceeded, Image: image}, nil
	case "failed", "canceled":
	default:
		return ArtResult{ID: job.ID, Status: model.ArtPending}, nil
	}
	_ = s.store.SetStatus(ctx, job.ID, model.ArtFailed)
	return ArtResult{ID: job.ID, Status: model.ArtFailed, Error: "La génération a échoué. Essayez une autre description."}, nil
}
