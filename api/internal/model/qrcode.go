package model

import (
	"encoding/json"
	"time"
)

const (
	StatusActive = "active"
	StatusPaused = "paused"
)

// QRCode is what the printed code points at. The code itself only ever encodes /r/<slug>, so the target, the
// content and even the kind can change after printing.
type QRCode struct {
	ID           string          `gorm:"type:uuid;primaryKey" json:"id"`
	OwnerSubject string          `gorm:"size:255;not null;index" json:"-"`
	Slug         string          `gorm:"size:16;not null;uniqueIndex" json:"slug"`
	Name         string          `gorm:"size:120;not null" json:"name"`
	Kind         string          `gorm:"size:16;not null" json:"kind"`
	Content      json.RawMessage `gorm:"type:jsonb;not null" json:"content" swaggertype:"object"`
	Design       json.RawMessage `gorm:"type:jsonb;not null" json:"design" swaggertype:"object"`
	Status       string          `gorm:"size:16;not null;default:active" json:"status"`
	PasswordHash string          `gorm:"size:100;not null;default:''" json:"-"`
	CreatedAt    time.Time       `gorm:"not null" json:"created_at"`
	UpdatedAt    time.Time       `gorm:"not null" json:"updated_at"`
}

func (QRCode) TableName() string { return "qr_codes" }
