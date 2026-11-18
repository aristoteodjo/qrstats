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
	"qrstats/internal/platform/logger"
	"qrstats/internal/service"
	"qrstats/internal/store"
)

// Build wires the whole API. Shared by the local server and the Vercel function, which is why this package sits
// outside internal/: Vercel compiles the function as a package of its own, and internal/ is closed to it.
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
	scans := service.NewScans(store.NewScanStore(db), cfg.VisitorSecret, cfg.TrustProxyHeaders, cfg.ClientIPHeader, nil)
	return api.New(cfg, log, db, api.Deps{
		Codes: codes, Scans: scans, Verifier: jwks.New(cfg.AuthJWKSURL, cfg.AuthIssuer, cfg.AuthAudience),
	}), nil
}

// FromEnv loads the configuration and builds the API, for callers outside the module (the Vercel function).
func FromEnv() (http.Handler, error) {
	cfg, err := config.Load()
	if err != nil {
		return nil, err
	}
	return Build(cfg, logger.New(cfg.LogLevel, false))
}
