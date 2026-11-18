package model

import "time"

const (
	ArtPending   = "pending"
	ArtSucceeded = "succeeded"
	ArtFailed    = "failed"
)

// ArtJob is one AI artwork requested for a QR code. Kept after the code is deleted: the daily quota counts it.
type ArtJob struct {
	ID           string    `gorm:"type:uuid;primaryKey" json:"id"`
	OwnerSubject string    `gorm:"size:255;not null;index:idx_art_owner_at,priority:1" json:"-"`
	QRCodeID     string    `gorm:"type:uuid;not null" json:"qr_code_id"`
	PredictionID string    `gorm:"size:64;not null;default:''" json:"-"`
	Prompt       string    `gorm:"size:500;not null" json:"prompt"`
	Status       string    `gorm:"size:16;not null" json:"status"`
	CreatedAt    time.Time `gorm:"not null;index:idx_art_owner_at,priority:2" json:"created_at"`
}

func (ArtJob) TableName() string { return "art_jobs" }
