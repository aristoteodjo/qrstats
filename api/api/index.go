// Package handler is the Vercel Go function: every path of the API project is rewritten here (vercel.json).
// It may only import qrstats/app: Vercel compiles it outside the module, where internal/ is closed.
package handler

import (
	"net/http"
	"sync"

	"qrstats/app"
)

var (
	once    sync.Once
	served  http.Handler
	initErr error
)

func Handler(w http.ResponseWriter, r *http.Request) {
	once.Do(func() { served, initErr = app.FromEnv() })
	if initErr != nil {
		http.Error(w, "service unavailable", http.StatusServiceUnavailable)
		return
	}
	served.ServeHTTP(w, r)
}
