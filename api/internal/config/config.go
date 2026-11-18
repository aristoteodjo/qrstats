package config

import (
	"errors"
	"fmt"
	"os"
	"strconv"
	"strings"

	"github.com/joho/godotenv"
)

type Config struct {
	Env            string
	ListenAddr     string
	LogLevel       string
	SwaggerEnabled bool

	DatabaseURL    string
	MigrateOnStart bool

	CORSAllowedOrigins []string

	// WebURL is where the web app lives: the redirect sends every scan that is not a plain link to its landing page.
	WebURL string

	AuthJWKSURL  string
	AuthIssuer   string
	AuthAudience string

	// VisitorSecret keys the daily visitor hash. Without it a hash could be reversed by trying every IP address.
	VisitorSecret string

	// TrustProxyHeaders reads the client IP and geolocation from the platform's headers (Vercel, Cloudflare).
	// Off when the API is reached directly, where any caller could forge them.
	TrustProxyHeaders bool

	// ClientIPHeader is the one header the edge overwrites with the caller's address (Vercel: X-Vercel-Forwarded-For,
	// Cloudflare: CF-Connecting-IP). Any other forwarding header can be set by the caller and is ignored.
	ClientIPHeader string

	// ShortURL is this API's public address: the one printed in every code (/r/<slug>), encoded in AI artworks.
	ShortURL string

	// ReplicateToken enables AI artworks; without it the feature answers "unavailable".
	ReplicateToken   string
	ReplicateVersion string
	// ReplicateBaseURL points at a stand-in server, in development only: in production the token goes to Replicate.
	ReplicateBaseURL string
	ArtDailyLimit    int
}

func (c *Config) IsDevelopment() bool {
	return c.Env == "development"
}

// Load reads .env when present, then the process environment, and reports every problem at once.
func Load() (*Config, error) {
	_ = godotenv.Load()

	var problems []error

	webURL := strings.TrimSuffix(envOr("WEB_URL", "http://localhost:3110"), "/")
	cfg := &Config{
		Env:                envOr("APP_ENV", "development"),
		ListenAddr:         envOr("LISTEN_ADDR", ":8110"),
		LogLevel:           envOr("LOG_LEVEL", "info"),
		SwaggerEnabled:     boolOr("SWAGGER_ENABLED", true, &problems),
		DatabaseURL:        os.Getenv("DATABASE_URL"),
		MigrateOnStart:     boolOr("MIGRATE_ON_START", false, &problems),
		CORSAllowedOrigins: splitList(envOr("CORS_ALLOWED_ORIGINS", webURL)),
		WebURL:             webURL,
		AuthJWKSURL:        envOr("AUTH_JWKS_URL", webURL+"/api/auth/jwks"),
		AuthIssuer:         envOr("AUTH_ISSUER", webURL),
		AuthAudience:       envOr("AUTH_AUDIENCE", "qrstats-api"),
		VisitorSecret:      os.Getenv("VISITOR_SECRET"),
		TrustProxyHeaders:  boolOr("TRUST_PROXY_HEADERS", false, &problems),
		ClientIPHeader:     envOr("CLIENT_IP_HEADER", "X-Vercel-Forwarded-For"),
		ShortURL:           strings.TrimSuffix(envOr("SHORT_URL", "http://localhost:8110"), "/"),
		ReplicateToken:     os.Getenv("REPLICATE_API_TOKEN"),
		// andreasjansson/illusion: Stable Diffusion 1.5 with the QR Code Monster ControlNet.
		ReplicateVersion: envOr("REPLICATE_ART_VERSION", "75d51a73fce3c00de31ed9ab4358c73e8fc0f627dc8ce975818e653317cb919b"),
		ReplicateBaseURL: os.Getenv("REPLICATE_BASE_URL"),
		ArtDailyLimit:    intOr("ART_DAILY_LIMIT", 10, &problems),
	}

	if cfg.DatabaseURL == "" {
		problems = append(problems, errors.New("DATABASE_URL is required"))
	}
	if len(cfg.VisitorSecret) < 32 {
		if cfg.IsDevelopment() {
			cfg.VisitorSecret = "development-visitor-secret-not-for-production"
		} else {
			problems = append(problems, errors.New("VISITOR_SECRET must be at least 32 characters"))
		}
	}
	if !cfg.IsDevelopment() {
		cfg.ReplicateBaseURL = ""
	}
	for _, origin := range cfg.CORSAllowedOrigins {
		if origin == "*" {
			problems = append(problems, errors.New("CORS_ALLOWED_ORIGINS cannot contain *"))
		}
	}

	if len(problems) > 0 {
		return nil, fmt.Errorf("invalid configuration: %w", errors.Join(problems...))
	}
	return cfg, nil
}

func envOr(key, fallback string) string {
	if value := strings.TrimSpace(os.Getenv(key)); value != "" {
		return value
	}
	return fallback
}

func boolOr(key string, fallback bool, problems *[]error) bool {
	raw := strings.TrimSpace(os.Getenv(key))
	if raw == "" {
		return fallback
	}
	value, err := strconv.ParseBool(raw)
	if err != nil {
		*problems = append(*problems, fmt.Errorf("%s: %q is not a boolean", key, raw))
		return fallback
	}
	return value
}

func intOr(key string, fallback int, problems *[]error) int {
	raw := strings.TrimSpace(os.Getenv(key))
	if raw == "" {
		return fallback
	}
	value, err := strconv.Atoi(raw)
	if err != nil || value < 0 {
		*problems = append(*problems, fmt.Errorf("%s: %q is not a positive integer", key, raw))
		return fallback
	}
	return value
}

func splitList(raw string) []string {
	var out []string
	for _, part := range strings.Split(raw, ",") {
		if part = strings.TrimSuffix(strings.TrimSpace(part), "/"); part != "" {
			out = append(out, part)
		}
	}
	return out
}
