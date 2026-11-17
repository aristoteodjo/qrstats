package api

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/rs/zerolog"
	swaggerfiles "github.com/swaggo/files"
	ginswagger "github.com/swaggo/gin-swagger"
	"gorm.io/gorm"

	_ "qrstats/docs"
	"qrstats/internal/api/dto"
	"qrstats/internal/api/handler"
	"qrstats/internal/api/middleware"
	"qrstats/internal/config"
	"qrstats/internal/platform/database"
	"qrstats/internal/platform/jwks"
	"qrstats/internal/service"
)

type Deps struct {
	Codes    *service.QRCodes
	Scans    *service.Scans
	Verifier *jwks.Verifier
}

func New(cfg *config.Config, log zerolog.Logger, db *gorm.DB, deps Deps) *gin.Engine {
	if !cfg.IsDevelopment() {
		gin.SetMode(gin.ReleaseMode)
	}
	engine := gin.New()
	// Client IPs are read by service.ClientIP under TRUST_PROXY_HEADERS, never by gin's own guess.
	_ = engine.SetTrustedProxies(nil)
	engine.Use(middleware.RequestID(), middleware.Recovery(log), middleware.Logger(log), middleware.CORS(cfg.CORSAllowedOrigins))
	engine.NoRoute(func(c *gin.Context) { dto.Error(c, http.StatusNotFound, "not_found", "Introuvable.") })

	engine.GET("/healthz", func(c *gin.Context) {
		if err := database.Ping(db); err != nil {
			dto.Error(c, http.StatusServiceUnavailable, "unavailable", "Base de données injoignable.")
			return
		}
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})
	if cfg.SwaggerEnabled {
		engine.GET("/swagger/*any", ginswagger.WrapHandler(swaggerfiles.Handler))
	}

	public := handler.NewPublic(deps.Codes, deps.Scans, cfg.WebURL, cfg.TrustProxyHeaders, log)
	engine.GET("/r/:slug", public.Redirect)

	v1 := engine.Group("/api/v1")
	v1.GET("/public/qr/:slug", public.Show)
	v1.POST("/public/qr/:slug/unlock", public.Unlock)

	owned := v1.Group("", middleware.RequireOwner(deps.Verifier))
	codes := handler.NewQRCodes(deps.Codes, log)
	owned.GET("/qrcodes", codes.List)
	owned.POST("/qrcodes", codes.Create)
	owned.GET("/qrcodes/:id", codes.Get)
	owned.PATCH("/qrcodes/:id", codes.Update)
	owned.DELETE("/qrcodes/:id", codes.Delete)
	owned.GET("/stats", handler.NewStats(deps.Scans, deps.Codes, log).Get)

	return engine
}
