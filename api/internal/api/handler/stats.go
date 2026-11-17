package handler

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/rs/zerolog"

	"qrstats/internal/api/middleware"
	"qrstats/internal/service"
)

type Stats struct {
	scans *service.Scans
	codes *service.QRCodes
	log   zerolog.Logger
}

func NewStats(scans *service.Scans, codes *service.QRCodes, log zerolog.Logger) *Stats {
	return &Stats{scans: scans, codes: codes, log: log}
}

// Get godoc
//
//	@Summary	Scan statistics over a period, for every code of the caller or one of them
//	@Tags		stats
//	@Security	BearerAuth
//	@Param		qr_code_id	query		string	false	"Narrow to one QR code"
//	@Param		from		query		string	false	"First day, YYYY-MM-DD (default: 29 days before to)"
//	@Param		to			query		string	false	"Last day, YYYY-MM-DD (default: today)"
//	@Param		tz			query		string	false	"IANA time zone the days are read in (default UTC)"
//	@Success	200			{object}	service.Stats
//	@Failure	400			{object}	dto.ErrorResponse
//	@Failure	404			{object}	dto.ErrorResponse
//	@Router		/stats [get]
func (h *Stats) Get(c *gin.Context) {
	r, err := service.ParseRange(c.Query("from"), c.Query("to"), c.Query("tz"), time.Now())
	if err != nil {
		fail(c, h.log, err)
		return
	}
	owner := middleware.Owner(c)
	id := c.Query("qr_code_id")
	if id != "" {
		// Another owner's code answers 404, exactly like a code that does not exist.
		if _, err := h.codes.Get(c.Request.Context(), owner, id); err != nil {
			fail(c, h.log, err)
			return
		}
	}
	stats, err := h.scans.Stats(c.Request.Context(), service.StatsQuery{Owner: owner, QRCodeID: id, Range: r})
	if err != nil {
		fail(c, h.log, err)
		return
	}
	c.JSON(http.StatusOK, stats)
}
