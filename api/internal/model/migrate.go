package model

import (
	"fmt"

	"gorm.io/gorm"
)

// Migrate creates the API tables and the schema Better Auth keeps its own tables in.
func Migrate(db *gorm.DB) error {
	if err := db.Exec("CREATE SCHEMA IF NOT EXISTS better_auth").Error; err != nil {
		return fmt.Errorf("create better_auth schema: %w", err)
	}
	if err := db.AutoMigrate(&QRCode{}, &Scan{}); err != nil {
		return err
	}
	// Deleting a QR code deletes its scans; AutoMigrate does not declare foreign keys without an association.
	return db.Exec(`DO $$ BEGIN
		IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_scans_qr_code') THEN
			ALTER TABLE scans ADD CONSTRAINT fk_scans_qr_code
				FOREIGN KEY (qr_code_id) REFERENCES qr_codes(id) ON DELETE CASCADE;
		END IF;
	END $$`).Error
}
