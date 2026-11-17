package store

import (
	"context"
	"database/sql"
	"errors"
	"strings"
	"time"

	"github.com/jackc/pgx/v5/pgconn"
	"gorm.io/gorm"

	"qrstats/internal/model"
	"qrstats/internal/service"
)

type QRCodeStore struct{ db *gorm.DB }

func NewQRCodeStore(db *gorm.DB) *QRCodeStore { return &QRCodeStore{db: db} }

func (s *QRCodeStore) Create(ctx context.Context, qr *model.QRCode) error {
	err := s.db.WithContext(ctx).Create(qr).Error
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) && pgErr.Code == "23505" && strings.Contains(pgErr.ConstraintName, "slug") {
		return service.ErrSlugTaken
	}
	return err
}

func (s *QRCodeStore) Get(ctx context.Context, owner, id string) (*model.QRCode, error) {
	var qr model.QRCode
	err := s.db.WithContext(ctx).Where("id = ? AND owner_subject = ?", id, owner).Take(&qr).Error
	return found(&qr, err)
}

func (s *QRCodeStore) BySlug(ctx context.Context, slug string) (*model.QRCode, error) {
	var qr model.QRCode
	err := s.db.WithContext(ctx).Where("slug = ?", slug).Take(&qr).Error
	return found(&qr, err)
}

func (s *QRCodeStore) List(ctx context.Context, owner string, filter service.ListFilter) ([]service.QRSummary, int64, error) {
	base := s.db.WithContext(ctx).Model(&model.QRCode{}).Where("qr_codes.owner_subject = ?", owner)
	if filter.Status != "" {
		base = base.Where("qr_codes.status = ?", filter.Status)
	}
	if filter.Kind != "" {
		base = base.Where("qr_codes.kind = ?", filter.Kind)
	}
	if filter.Search != "" {
		like := "%" + escapeLike(filter.Search) + "%"
		base = base.Where("(qr_codes.name ILIKE ? OR qr_codes.slug ILIKE ? OR qr_codes.content::text ILIKE ?)", like, like, like)
	}
	var total int64
	if err := base.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	var rows []service.QRSummary
	err := base.
		Select("qr_codes.*, COALESCE(s.scans, 0) AS scans, s.last_scan_at").
		Joins("LEFT JOIN (SELECT qr_code_id, COUNT(*) AS scans, MAX(at) AS last_scan_at FROM scans GROUP BY qr_code_id) s ON s.qr_code_id = qr_codes.id").
		Order(orderFor(filter.Sort) + ", qr_codes.id DESC").
		Offset((filter.Page - 1) * filter.PerPage).Limit(filter.PerPage).
		Scan(&rows).Error
	return rows, total, err
}

var listOrder = map[string]string{
	"recent":  "qr_codes.created_at DESC",
	"oldest":  "qr_codes.created_at ASC",
	"updated": "qr_codes.updated_at DESC",
	"name":    "lower(qr_codes.name) ASC",
	"scans":   "COALESCE(s.scans, 0) DESC",
}

func orderFor(sort string) string {
	if order, ok := listOrder[sort]; ok {
		return order
	}
	return listOrder["recent"]
}

func (s *QRCodeStore) Update(ctx context.Context, qr *model.QRCode) error {
	result := s.db.WithContext(ctx).Model(&model.QRCode{}).
		Where("id = ? AND owner_subject = ?", qr.ID, qr.OwnerSubject).
		Updates(map[string]any{
			"name": qr.Name, "kind": qr.Kind, "content": qr.Content, "design": qr.Design,
			"status": qr.Status, "password_hash": qr.PasswordHash, "updated_at": qr.UpdatedAt,
		})
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return service.ErrNotFound
	}
	return nil
}

func (s *QRCodeStore) Delete(ctx context.Context, owner, id string) error {
	result := s.db.WithContext(ctx).Where("id = ? AND owner_subject = ?", id, owner).Delete(&model.QRCode{})
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return service.ErrNotFound
	}
	return nil
}

// RecordUnlockFailure is one atomic UPDATE, so concurrent instances never lose a count.
func (s *QRCodeStore) RecordUnlockFailure(ctx context.Context, id string, now time.Time, window time.Duration) (int, error) {
	var count int
	err := s.db.WithContext(ctx).Raw(`
		UPDATE qr_codes SET
			unlock_failures = CASE WHEN unlock_window_start IS NULL OR unlock_window_start <= @expired THEN 1 ELSE unlock_failures + 1 END,
			unlock_window_start = CASE WHEN unlock_window_start IS NULL OR unlock_window_start <= @expired THEN @now ELSE unlock_window_start END
		WHERE id = @id
		RETURNING unlock_failures`,
		sql.Named("expired", now.Add(-window)), sql.Named("now", now), sql.Named("id", id)).Scan(&count).Error
	return count, err
}

func found(qr *model.QRCode, err error) (*model.QRCode, error) {
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, service.ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	return qr, nil
}

func escapeLike(value string) string {
	return strings.NewReplacer(`\`, `\\`, "%", `\%`, "_", `\_`).Replace(value)
}
