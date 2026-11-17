package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/rs/zerolog"

	"qrstats/internal/api/dto"
	"qrstats/internal/api/middleware"
	"qrstats/internal/model"
	"qrstats/internal/service"
)

type QRCodes struct {
	codes *service.QRCodes
	log   zerolog.Logger
}

func NewQRCodes(codes *service.QRCodes, log zerolog.Logger) *QRCodes {
	return &QRCodes{codes: codes, log: log}
}

// QRCodeView is a code as its owner sees it: never the password hash, only whether there is one.
type QRCodeView struct {
	model.QRCode
	Protected bool `json:"protected"`
}

type QRSummaryView struct {
	service.QRSummary
	Protected bool `json:"protected"`
}

// QRCodePage documents the list response: dto.Page of QRSummaryView (swag cannot read generic types).
type QRCodePage struct {
	Data    []QRSummaryView `json:"data"`
	Total   int64           `json:"total"`
	Page    int             `json:"page"`
	PerPage int             `json:"per_page"`
	Pages   int             `json:"pages"`
}

func view(qr *model.QRCode) QRCodeView {
	return QRCodeView{QRCode: *qr, Protected: qr.PasswordHash != ""}
}

// List godoc
//
//	@Summary	List the caller's QR codes, newest first
//	@Tags		qrcodes
//	@Security	BearerAuth
//	@Param		page		query		int		false	"Page (1-based)"
//	@Param		per_page	query		int		false	"Rows per page (max 100)"
//	@Param		q			query		string	false	"Search in name, slug and content"
//	@Param		status		query		string	false	"active or paused"
//	@Param		kind		query		string	false	"url, text, vcard, wifi, email, phone or sms"
//	@Param		sort		query		string	false	"recent (default), oldest, updated, name or scans"
//	@Success	200			{object}	QRCodePage
//	@Router		/qrcodes [get]
func (h *QRCodes) List(c *gin.Context) {
	page, perPage := dto.ParsePagination(c)
	rows, total, err := h.codes.List(c.Request.Context(), middleware.Owner(c), service.ListFilter{
		Search: c.Query("q"), Status: c.Query("status"), Kind: c.Query("kind"), Sort: c.Query("sort"),
		Page: page, PerPage: perPage,
	})
	if err != nil {
		fail(c, h.log, err)
		return
	}
	views := make([]QRSummaryView, len(rows))
	for i, row := range rows {
		views[i] = QRSummaryView{QRSummary: row, Protected: row.PasswordHash != ""}
	}
	c.JSON(http.StatusOK, dto.NewPage(views, total, page, perPage))
}

// Create godoc
//
//	@Summary	Create a QR code
//	@Tags		qrcodes
//	@Security	BearerAuth
//	@Param		body	body		service.CreateInput	true	"QR code"
//	@Success	201		{object}	QRCodeView
//	@Failure	400		{object}	dto.ErrorResponse
//	@Router		/qrcodes [post]
func (h *QRCodes) Create(c *gin.Context) {
	var in service.CreateInput
	if err := c.ShouldBindJSON(&in); err != nil {
		dto.Error(c, http.StatusBadRequest, "invalid", "Requête invalide.")
		return
	}
	qr, err := h.codes.Create(c.Request.Context(), middleware.Owner(c), in)
	if err != nil {
		fail(c, h.log, err)
		return
	}
	c.JSON(http.StatusCreated, view(qr))
}

// Get godoc
//
//	@Summary	One of the caller's QR codes
//	@Tags		qrcodes
//	@Security	BearerAuth
//	@Param		id	path		string	true	"QR code id"
//	@Success	200	{object}	QRCodeView
//	@Failure	404	{object}	dto.ErrorResponse
//	@Router		/qrcodes/{id} [get]
func (h *QRCodes) Get(c *gin.Context) {
	qr, err := h.codes.Get(c.Request.Context(), middleware.Owner(c), c.Param("id"))
	if err != nil {
		fail(c, h.log, err)
		return
	}
	c.JSON(http.StatusOK, view(qr))
}

// Update godoc
//
//	@Summary	Change what a QR code leads to, its look, its status or its password
//	@Tags		qrcodes
//	@Security	BearerAuth
//	@Param		id		path		string				true	"QR code id"
//	@Param		body	body		service.PatchInput	true	"Fields to change"
//	@Success	200		{object}	QRCodeView
//	@Failure	400		{object}	dto.ErrorResponse
//	@Failure	404		{object}	dto.ErrorResponse
//	@Router		/qrcodes/{id} [patch]
func (h *QRCodes) Update(c *gin.Context) {
	var in service.PatchInput
	if err := c.ShouldBindJSON(&in); err != nil {
		dto.Error(c, http.StatusBadRequest, "invalid", "Requête invalide.")
		return
	}
	qr, err := h.codes.Update(c.Request.Context(), middleware.Owner(c), c.Param("id"), in)
	if err != nil {
		fail(c, h.log, err)
		return
	}
	c.JSON(http.StatusOK, view(qr))
}

// Delete godoc
//
//	@Summary	Delete a QR code and its scans
//	@Tags		qrcodes
//	@Security	BearerAuth
//	@Param		id	path	string	true	"QR code id"
//	@Success	204
//	@Failure	404	{object}	dto.ErrorResponse
//	@Router		/qrcodes/{id} [delete]
func (h *QRCodes) Delete(c *gin.Context) {
	if err := h.codes.Delete(c.Request.Context(), middleware.Owner(c), c.Param("id")); err != nil {
		fail(c, h.log, err)
		return
	}
	c.Status(http.StatusNoContent)
}
