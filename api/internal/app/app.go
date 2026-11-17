package app

import (
	"fmt"
	"net/http"

	"github.com/rs/zerolog"

	"qrstats/internal/api"
	"qrstats/internal/config"
	"qrstats/internal/model"
	"qrstats/internal/platform/database"
	"qrstats/internal/platform/jwks"
	"qrstats/internal/service"
	"qrstats/internal/store"
)

// Build wires the whole API. Shared by the local server and the Vercel function.
func Build(cfg *config.Config, log zerolog.Logger) (http.Handler, error) {
	db, err := database.Open(cfg.DatabaseURL, cfg.IsDevelopment())
	if err != nil {
		return nil, err
	}
	if cfg.MigrateOnStart {
		if err := model.Migrate(db); err != nil {
			return nil, fmt.Errorf("migrate: %w", err)
		}
	}
	codes := service.NewQRCodes(store.NewQRCodeStore(db), nil)
	scans := service.NewScans(store.NewScanStore(db), cfg.VisitorSecret, cfg.TrustProxyHeaders, nil)
	return api.New(cfg, log, db, api.Deps{
		Codes: codes, Scans: scans, Verifier: jwks.New(cfg.AuthJWKSURL, cfg.AuthIssuer, cfg.AuthAudience),
	}), nil
}
