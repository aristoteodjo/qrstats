package service

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"net"
	"net/http"
	"net/url"
	"strings"
	"time"
)

// VisitorHash counts unique visitors without keeping an IP address: a keyed hash of the IP and user agent that
// changes every UTC day, so the same person cannot be followed from one day to the next.
func VisitorHash(secret, ip, userAgent string, at time.Time) string {
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write([]byte(at.UTC().Format("2006-01-02") + "|" + ip + "|" + userAgent))
	return hex.EncodeToString(mac.Sum(nil))[:32]
}

// ClientIP trusts forwarding headers only behind a platform that sets them; otherwise any caller could forge them.
func ClientIP(header http.Header, remoteAddr string, trustProxy bool) string {
	if trustProxy {
		for _, name := range []string{"X-Vercel-Forwarded-For", "CF-Connecting-IP", "X-Real-IP", "X-Forwarded-For"} {
			if value := strings.TrimSpace(strings.Split(header.Get(name), ",")[0]); net.ParseIP(value) != nil {
				return value
			}
		}
	}
	host, _, err := net.SplitHostPort(remoteAddr)
	if err != nil {
		return remoteAddr
	}
	return host
}

// Location reads the country and city the hosting platform resolved for the request (Vercel, then Cloudflare).
func Location(header http.Header, trustProxy bool) (country, city string) {
	if !trustProxy {
		return Unknown, Unknown
	}
	country = strings.ToUpper(strings.TrimSpace(header.Get("X-Vercel-IP-Country")))
	if country == "" {
		country = strings.ToUpper(strings.TrimSpace(header.Get("CF-IPCountry")))
	}
	if len(country) != 2 || country == "XX" || country == "T1" {
		country = Unknown
	}
	city = header.Get("X-Vercel-IP-City")
	if city == "" {
		city = header.Get("CF-IPCity")
	}
	// Vercel sends the city percent-encoded ("S%C3%A3o%20Paulo").
	if decoded, err := url.QueryUnescape(city); err == nil {
		city = decoded
	}
	return country, clip(city, 80)
}
