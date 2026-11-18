package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/rs/zerolog"

	"qrstats/internal/api/dto"
	"qrstats/internal/api/middleware"
	"qrstats/internal/service"
)

type Art struct {
	art *service.Art
	log zerolog.Logger
}

func NewArt(art *service.Art, log zerolog.Logger) *Art { return &Art{art: art, log: log} }

// ArtStarted is the answer to a new artwork: poll GET /art/{id} until it is ready.
type ArtStarted struct {
	ID     string           `json:"id"`
	Status string           `json:"status"`
	Quota  service.ArtQuota `json:"quota"`
}

// Quota godoc
//
//	@Summary	Whether AI artworks are available, and how many are left today
//	@Tags		art
//	@Security	BearerAuth
//	@Success	200	{object}	service.ArtQuota
//	@Router		/art/quota [get]
func (h *Art) Quota(c *gin.Context) {
	quota, err := h.art.Quota(c.Request.Context(), middleware.Owner(c))
	if err != nil {
		fail(c, h.log, err)
		return
	}
	c.JSON(http.StatusOK, quota)
}

// Start godoc
//
//	@Summary	Start an AI artwork that encodes the code's short link
//	@Tags		art
//	@Security	BearerAuth
//	@Param		id		path		string					true	"QR code id"
//	@Param		body	body		service.ArtStartInput	true	"Description and style"
//	@Success	202		{object}	ArtStarted
//	@Failure	400		{object}	dto.ErrorResponse
//	@Failure	404		{object}	dto.ErrorResponse
//	@Failure	429		{object}	dto.ErrorResponse
//	@Failure	503		{object}	dto.ErrorResponse
//	@Router		/qrcodes/{id}/art [post]
func (h *Art) Start(c *gin.Context) {
	var in service.ArtStartInput
	if err := c.ShouldBindJSON(&in); err != nil {
		dto.Error(c, http.StatusBadRequest, "invalid", "Requête invalide.")
		return
	}
	job, quota, err := h.art.Start(c.Request.Context(), middleware.Owner(c), c.Param("id"), in)
	if err != nil {
		fail(c, h.log, err)
		return
	}
	c.JSON(http.StatusAccepted, ArtStarted{ID: job.ID, Status: job.Status, Quota: quota})
}

// Result godoc
//
//	@Summary	An artwork's progress, with the image once ready
//	@Tags		art
//	@Security	BearerAuth
//	@Param		id	path		string	true	"Artwork id"
//	@Success	200	{object}	service.ArtResult
//	@Failure	404	{object}	dto.ErrorResponse
//	@Router		/art/{id} [get]
func (h *Art) Result(c *gin.Context) {
	result, err := h.art.Result(c.Request.Context(), middleware.Owner(c), c.Param("id"))
	if err != nil {
		fail(c, h.log, err)
		return
	}
	c.JSON(http.StatusOK, result)
}
