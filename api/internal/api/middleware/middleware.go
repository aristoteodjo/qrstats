package middleware

import (
	"net/http"
	"runtime/debug"
	"slices"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/rs/zerolog"

	"qrstats/internal/api/dto"
	"qrstats/internal/platform/jwks"
)

const (
	RequestIDHeader = "X-Request-ID"
	requestIDKey    = "request_id"
	ownerKey        = "owner"
)

func RequestID() gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.GetHeader(RequestIDHeader)
		if id == "" || len(id) > 64 {
			id = uuid.NewString()
		}
		c.Set(requestIDKey, id)
		c.Writer.Header().Set(RequestIDHeader, id)
		c.Next()
	}
}

func RequestIDOf(c *gin.Context) string { return c.GetString(requestIDKey) }

func Logger(log zerolog.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()
		c.Next()
		event := log.Info()
		if c.Writer.Status() >= 500 {
			event = log.Error()
		} else if c.Writer.Status() >= 400 {
			event = log.Warn()
		}
		event.Str("request_id", RequestIDOf(c)).Str("method", c.Request.Method).
			Str("path", c.FullPath()).Int("status", c.Writer.Status()).
			Dur("duration", time.Since(start)).Msg("request")
	}
}

// Recovery keeps the stack trace server side; the client only learns that something failed.
func Recovery(log zerolog.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		defer func() {
			if recovered := recover(); recovered != nil {
				log.Error().Str("request_id", RequestIDOf(c)).Interface("panic", recovered).
					Bytes("stack", debug.Stack()).Msg("panic recovered")
				dto.Error(c, http.StatusInternalServerError, "internal", "Erreur interne.")
			}
		}()
		c.Next()
	}
}

// CORS echoes back one explicit origin, never a wildcard.
func CORS(allowedOrigins []string) gin.HandlerFunc {
	return func(c *gin.Context) {
		origin := strings.TrimSuffix(c.GetHeader("Origin"), "/")
		if origin != "" && slices.Contains(allowedOrigins, origin) {
			h := c.Writer.Header()
			h.Set("Access-Control-Allow-Origin", origin)
			h.Set("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS")
			h.Set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Request-ID")
			h.Set("Access-Control-Expose-Headers", "X-Request-ID")
			h.Set("Access-Control-Max-Age", "600")
		}
		c.Writer.Header().Add("Vary", "Origin")
		if c.Request.Method == http.MethodOptions {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}
		c.Next()
	}
}

// RequireOwner admits a request carrying a valid Better Auth JWT; its subject owns every code it touches.
func RequireOwner(verifier *jwks.Verifier) gin.HandlerFunc {
	return func(c *gin.Context) {
		raw, ok := strings.CutPrefix(c.GetHeader("Authorization"), "Bearer ")
		if !ok || raw == "" {
			dto.Error(c, http.StatusUnauthorized, "unauthorized", "Connexion requise.")
			return
		}
		claims, err := verifier.Verify(c.Request.Context(), raw)
		if err != nil {
			dto.Error(c, http.StatusUnauthorized, "unauthorized", "Session expirée, reconnectez-vous.")
			return
		}
		c.Set(ownerKey, claims.Subject)
		c.Next()
	}
}

func Owner(c *gin.Context) string { return c.GetString(ownerKey) }
