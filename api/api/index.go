// Package handler is the Vercel Go function: every path of the API project is rewritten here (vercel.json).
package handler

import (
	"net/http"
	"sync"

	"qrstats/internal/app"
	"qrstats/internal/config"
	"qrstats/internal/platform/logger"
)

var (
	once    sync.Once
	served  http.Handler
	initErr error
)

func Handler(w http.ResponseWriter, r *http.Request) {
	once.Do(func() {
		cfg, err := config.Load()
		if err != nil {
			initErr = err
			return
		}
		served, initErr = app.Build(cfg, logger.New(cfg.LogLevel, false))
	})
	if initErr != nil {
		http.Error(w, "service unavailable", http.StatusServiceUnavailable)
		return
	}
	served.ServeHTTP(w, r)
}
