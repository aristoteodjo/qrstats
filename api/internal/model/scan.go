package model

import "time"

// Scan is one visit through /r/<slug>. No IP address is kept: Visitor is a keyed hash that changes every day.
type Scan struct {
	ID          string    `gorm:"type:uuid;primaryKey" json:"id"`
	QRCodeID    string    `gorm:"type:uuid;not null;index:idx_scans_qr_at,priority:1" json:"qr_code_id"`
	At          time.Time `gorm:"not null;index:idx_scans_qr_at,priority:2" json:"at"`
	Visitor     string    `gorm:"size:32;not null" json:"-"`
	Device      string    `gorm:"size:16;not null" json:"device"`
	OS          string    `gorm:"size:32;not null" json:"os"`
	Browser     string    `gorm:"size:32;not null" json:"browser"`
	Country     string    `gorm:"size:2;not null;default:''" json:"country"`
	City        string    `gorm:"size:80;not null;default:''" json:"city"`
	Referrer    string    `gorm:"size:120;not null;default:''" json:"referrer"`
	Language    string    `gorm:"size:8;not null;default:''" json:"language"`
	UTMSource   string    `gorm:"size:80;not null;default:''" json:"utm_source"`
	UTMMedium   string    `gorm:"size:80;not null;default:''" json:"utm_medium"`
	UTMCampaign string    `gorm:"size:80;not null;default:''" json:"utm_campaign"`
}

func (Scan) TableName() string { return "scans" }
