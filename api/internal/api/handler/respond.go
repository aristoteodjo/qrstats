package handler

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/rs/zerolog"

	"qrstats/internal/api/dto"
	"qrstats/internal/api/middleware"
	"qrstats/internal/service"
)

// fail maps the service vocabulary to HTTP. Anything unexpected is logged and answered without detail.
func fail(c *gin.Context, log zerolog.Logger, err error) {
	var validation *service.ValidationError
	switch {
	case errors.As(err, &validation):
		dto.FieldError(c, http.StatusBadRequest, validation.Field, validation.Message)
	case errors.Is(err, service.ErrNotFound):
		dto.Error(c, http.StatusNotFound, "not_found", "QR code introuvable.")
	case errors.Is(err, service.ErrWrongPassword):
		dto.Error(c, http.StatusForbidden, "wrong_password", "Mot de passe incorrect.")
	case errors.Is(err, service.ErrTooManyTries):
		dto.Error(c, http.StatusTooManyRequests, "too_many_attempts", "Trop d'essais. Réessayez dans quelques minutes.")
	case errors.Is(err, service.ErrPaused):
		dto.Error(c, http.StatusGone, "paused", "Ce QR code est désactivé.")
	case errors.Is(err, service.ErrArtUnavailable):
		dto.Error(c, http.StatusServiceUnavailable, "art_unavailable", "La création de visuels IA n'est pas activée.")
	case errors.Is(err, service.ErrArtQuota):
		dto.Error(c, http.StatusTooManyRequests, "art_quota", "Limite de visuels IA atteinte pour aujourd'hui.")
	case errors.Is(err, service.ErrArtProvider):
		log.Error().Err(err).Str("request_id", middleware.RequestIDOf(c)).Msg("art provider failed")
		dto.Error(c, http.StatusBadGateway, "art_failed", "Le service d'images ne répond pas. Réessayez dans un instant.")
	default:
		log.Error().Err(err).Str("request_id", middleware.RequestIDOf(c)).Msg("request failed")
		dto.Error(c, http.StatusInternalServerError, "internal", "Erreur interne.")
	}
}
