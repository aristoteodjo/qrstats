package store

import (
	"context"
	"fmt"

	"gorm.io/gorm"

	"qrstats/internal/model"
	"qrstats/internal/service"
)

type ScanStore struct{ db *gorm.DB }

func NewScanStore(db *gorm.DB) *ScanStore { return &ScanStore{db: db} }

func (s *ScanStore) Insert(ctx context.Context, scan *model.Scan) error {
	return s.db.WithContext(ctx).Create(scan).Error
}

// dimensionColumn is the only path from a dimension name to SQL.
var dimensionColumn = map[string]string{
	"device": "s.device", "os": "s.os", "browser": "s.browser", "country": "s.country", "city": "s.city",
	"referrer": "s.referrer", "language": "s.language",
	"utm_source": "s.utm_source", "utm_medium": "s.utm_medium", "utm_campaign": "s.utm_campaign",
}

func (s *ScanStore) scoped(ctx context.Context, q service.StatsQuery, r service.Range) *gorm.DB {
	db := s.db.WithContext(ctx).Table("scans AS s").
		Joins("JOIN qr_codes q ON q.id = s.qr_code_id").
		Where("q.owner_subject = ? AND s.at >= ? AND s.at < ?", q.Owner, r.Start().UTC(), r.End().UTC())
	if q.QRCodeID != "" {
		db = db.Where("s.qr_code_id = ?", q.QRCodeID)
	}
	return db
}

func (s *ScanStore) Stats(ctx context.Context, q service.StatsQuery) (service.StatsRows, error) {
	var out service.StatsRows
	tz := q.Range.Location.String()

	var totals struct{ Scans, Uniques int64 }
	if err := s.scoped(ctx, q, q.Range).Select("COUNT(*) AS scans, COUNT(DISTINCT s.visitor) AS uniques").Scan(&totals).Error; err != nil {
		return out, err
	}
	out.Scans, out.Uniques = totals.Scans, totals.Uniques

	var previous struct{ Scans, Uniques int64 }
	if err := s.scoped(ctx, q, q.Range.Previous()).Select("COUNT(*) AS scans, COUNT(DISTINCT s.visitor) AS uniques").Scan(&previous).Error; err != nil {
		return out, err
	}
	out.Previous = service.DayCount{Scans: previous.Scans, Uniques: previous.Uniques}

	if err := s.scoped(ctx, q, q.Range).
		Select("to_char(s.at AT TIME ZONE ?, 'YYYY-MM-DD') AS date, COUNT(*) AS scans, COUNT(DISTINCT s.visitor) AS uniques", tz).
		Group("date").Scan(&out.Days).Error; err != nil {
		return out, err
	}
	if err := s.scoped(ctx, q, q.Range).
		Select("EXTRACT(HOUR FROM s.at AT TIME ZONE ?)::int::text AS key, COUNT(*) AS count", tz).
		Group("key").Scan(&out.Hours).Error; err != nil {
		return out, err
	}
	if err := s.scoped(ctx, q, q.Range).
		Select("(EXTRACT(ISODOW FROM s.at AT TIME ZONE ?)::int - 1)::text AS key, COUNT(*) AS count", tz).
		Group("key").Scan(&out.Weekdays).Error; err != nil {
		return out, err
	}

	out.Dimensions = make(map[string][]service.Bucket, len(service.Dimensions))
	for _, name := range service.Dimensions {
		column, ok := dimensionColumn[name]
		if !ok {
			return out, fmt.Errorf("unknown dimension %q", name)
		}
		var buckets []service.Bucket
		if err := s.scoped(ctx, q, q.Range).
			Select(column + " AS key, COUNT(*) AS count").Group(column).
			Order("count DESC").Limit(50).Scan(&buckets).Error; err != nil {
			return out, err
		}
		if buckets == nil {
			buckets = []service.Bucket{}
		}
		out.Dimensions[name] = buckets
	}

	if q.QRCodeID == "" {
		if err := s.scoped(ctx, q, q.Range).
			Select("q.id, q.name, q.kind, COUNT(*) AS scans").Group("q.id, q.name, q.kind").
			Order("scans DESC").Limit(5).Scan(&out.TopCodes).Error; err != nil {
			return out, err
		}
	}
	return out, nil
}
