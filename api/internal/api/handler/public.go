package handler

import (
	"context"
	"errors"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/rs/zerolog"

	"qrstats/internal/api/dto"
	"qrstats/internal/model"
	"qrstats/internal/service"
)

type Public struct {
	codes  *service.QRCodes
	scans  *service.Scans
	webURL string
	trust  bool
	log    zerolog.Logger
}

func NewPublic(codes *service.QRCodes, scans *service.Scans, webURL string, trustProxy bool, log zerolog.Logger) *Public {
	return &Public{codes: codes, scans: scans, webURL: webURL, trust: trustProxy, log: log}
}

// PublicView adds the final link of a link code, so a landing page never rebuilds the UTM rules itself.
type PublicView struct {
	service.Public
	Target string `json:"target,omitempty"`
}

func withTarget(view service.Public) PublicView {
	out := PublicView{Public: view}
	if view.Content != nil {
		if link, ok := service.LinkTarget(view.Kind, view.Content); ok {
			out.Target, _ = service.ResolveTarget(link, service.Campaign{})
		}
	}
	return out
}

// Redirect godoc
//
//	@Summary		What a printed code opens: counts the scan, then redirects
//	@Description	A link code goes straight to its target (with UTM parameters); every other case lands on the web page /q/{slug}.
//	@Tags			public
//	@Param			slug	path	string	true	"Printed slug"
//	@Success		302
//	@Router			/r/{slug} [get]
func (h *Public) Redirect(c *gin.Context) {
	slug := c.Param("slug")
	landing := h.webURL + "/q/" + slug
	// Never cached: the whole point is that the target can change after printing.
	c.Header("Cache-Control", "no-store")
	c.Header("X-Robots-Tag", "noindex")

	qr, err := h.codes.Resolve(c.Request.Context(), slug)
	if err != nil {
		if !errors.Is(err, service.ErrNotFound) {
			h.log.Error().Err(err).Str("slug", slug).Msg("resolve failed")
		}
		c.Redirect(http.StatusFound, landing)
		return
	}
	if qr.Status != model.StatusActive || !service.IsDynamic(qr.Kind) {
		c.Redirect(http.StatusFound, landing)
		return
	}

	campaign := service.ScanCampaign(c.Request.URL.Query())
	target := landing
	if qr.PasswordHash == "" {
		if link, ok := service.LinkTarget(qr.Kind, qr.Content); ok {
			target, campaign = service.ResolveTarget(link, campaign)
		}
	}

	scan := h.scans.BuildScan(qr, service.ScanRequest{
		Header: c.Request.Header, RemoteAddr: c.Request.RemoteAddr, Query: c.Request.URL.Query(),
	}, campaign)
	// Recorded before answering: a serverless instance may freeze as soon as the response is sent. A failed write
	// costs one count, never the visitor's redirect.
	ctx, cancel := context.WithTimeout(c.Request.Context(), 2*time.Second)
	defer cancel()
	if err := h.scans.Record(ctx, scan); err != nil {
		h.log.Warn().Err(err).Str("slug", slug).Msg("scan not recorded")
	}
	c.Redirect(http.StatusFound, target)
}

// Show godoc
//
//	@Summary	What the landing page of a code may show (content hidden while locked or paused)
//	@Tags		public
//	@Param		slug	path		string	true	"Printed slug"
//	@Success	200		{object}	PublicView
//	@Failure	404		{object}	dto.ErrorResponse
//	@Router		/public/qr/{slug} [get]
func (h *Public) Show(c *gin.Context) {
	qr, err := h.codes.Resolve(c.Request.Context(), c.Param("slug"))
	if err != nil {
		fail(c, h.log, err)
		return
	}
	c.Header("Cache-Control", "no-store")
	c.JSON(http.StatusOK, withTarget(service.PublicView(qr)))
}

type unlockInput struct {
	Password string `json:"password"`
}

// Unlock godoc
//
//	@Summary	Open a password-protected code
//	@Tags		public
//	@Param		slug	path		string		true	"Printed slug"
//	@Param		body	body		unlockInput	true	"Password"
//	@Success	200		{object}	PublicView
//	@Failure	403		{object}	dto.ErrorResponse
//	@Failure	429		{object}	dto.ErrorResponse
//	@Router		/public/qr/{slug}/unlock [post]
func (h *Public) Unlock(c *gin.Context) {
	var in unlockInput
	if err := c.ShouldBindJSON(&in); err != nil || len(in.Password) > 200 {
		dto.Error(c, http.StatusBadRequest, "invalid", "Requête invalide.")
		return
	}
	ip := service.ClientIP(c.Request.Header, c.Request.RemoteAddr, h.trust)
	view, err := h.codes.Unlock(c.Request.Context(), c.Param("slug"), in.Password, ip)
	if err != nil {
		fail(c, h.log, err)
		return
	}
	c.Header("Cache-Control", "no-store")
	c.JSON(http.StatusOK, withTarget(view))
}
