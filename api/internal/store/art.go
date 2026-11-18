package store

import (
	"context"
	"errors"
	"time"

	"gorm.io/gorm"

	"qrstats/internal/model"
	"qrstats/internal/service"
)

type ArtStore struct{ db *gorm.DB }

func NewArtStore(db *gorm.DB) *ArtStore { return &ArtStore{db: db} }

func countArt(tx *gorm.DB, owner string, since time.Time) (int, error) {
	var used int64
	err := tx.Model(&model.ArtJob{}).
		Where("owner_subject = ? AND created_at > ? AND status <> ?", owner, since, model.ArtAborted).
		Count(&used).Error
	return int(used), err
}

// Reserve counts every job but aborted ones (a failed run is still billed), and inserts under a per-owner advisory lock, so two concurrent requests never share the last slot.
func (s *ArtStore) Reserve(ctx context.Context, job *model.ArtJob, since time.Time, limit int) (int, error) {
	var used int
	err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.Exec("SELECT pg_advisory_xact_lock(hashtext(?))", "art:"+job.OwnerSubject).Error; err != nil {
			return err
		}
		count, err := countArt(tx, job.OwnerSubject, since)
		if err != nil {
			return err
		}
		if count >= limit {
			return service.ErrArtQuota
		}
		used = count + 1
		return tx.Create(job).Error
	})
	return used, err
}

func (s *ArtStore) Used(ctx context.Context, owner string, since time.Time) (int, error) {
	return countArt(s.db.WithContext(ctx), owner, since)
}

func (s *ArtStore) Get(ctx context.Context, owner, id string) (*model.ArtJob, error) {
	var job model.ArtJob
	err := s.db.WithContext(ctx).Where("id = ? AND owner_subject = ?", id, owner).Take(&job).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, service.ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	return &job, nil
}

func (s *ArtStore) SetPrediction(ctx context.Context, id, predictionID string) error {
	return s.db.WithContext(ctx).Model(&model.ArtJob{}).Where("id = ?", id).Update("prediction_id", predictionID).Error
}

func (s *ArtStore) SetStatus(ctx context.Context, id, status string) error {
	return s.db.WithContext(ctx).Model(&model.ArtJob{}).Where("id = ?", id).Update("status", status).Error
}
