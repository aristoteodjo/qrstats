package service

import (
	"net/url"
	"regexp"
	"strings"
)

// Client is what a scan says about the device that opened it, read from request headers only.
type Client struct {
	Device   string
	OS       string
	Browser  string
	Language string
	Referrer string
}

const (
	DeviceMobile  = "mobile"
	DeviceTablet  = "tablet"
	DeviceDesktop = "desktop"
	Unknown       = ""
)

var (
	botPattern     = regexp.MustCompile(`(?i)bot\b|bot/|crawl|spider|slurp|facebookexternalhit|embedly|preview|whatsapp/|telegram|discord|slack|curl/|wget/|python-requests|go-http-client|headless|lighthouse|monitor`)
	tabletPattern  = regexp.MustCompile(`(?i)ipad|tablet|kindle|silk/|playbook`)
	mobilePattern  = regexp.MustCompile(`(?i)mobi|iphone|ipod|android|windows phone`)
	androidPattern = regexp.MustCompile(`(?i)android`)
)

// IsBot: link previews (messaging apps), crawlers and scripts are not scans and are never counted.
func IsBot(userAgent string) bool {
	return strings.TrimSpace(userAgent) == "" || botPattern.MatchString(userAgent)
}

// ParseClient is deliberately small: a handful of families covers what a QR code scan comes from.
func ParseClient(userAgent, acceptLanguage, referer string) Client {
	ua := strings.ToLower(userAgent)
	return Client{
		Device:   device(ua),
		OS:       operatingSystem(ua),
		Browser:  browser(ua),
		Language: language(acceptLanguage),
		Referrer: referrerHost(referer),
	}
}

func device(ua string) string {
	switch {
	case tabletPattern.MatchString(ua), androidPattern.MatchString(ua) && !strings.Contains(ua, "mobile"):
		return DeviceTablet
	case mobilePattern.MatchString(ua):
		return DeviceMobile
	default:
		return DeviceDesktop
	}
}

func operatingSystem(ua string) string {
	switch {
	case strings.Contains(ua, "iphone"), strings.Contains(ua, "ipad"), strings.Contains(ua, "ipod"):
		return "iOS"
	case strings.Contains(ua, "android"):
		return "Android"
	case strings.Contains(ua, "windows"):
		return "Windows"
	case strings.Contains(ua, "cros"):
		return "ChromeOS"
	case strings.Contains(ua, "mac os x"), strings.Contains(ua, "macintosh"):
		return "macOS"
	case strings.Contains(ua, "linux"):
		return "Linux"
	default:
		return "Autre"
	}
}

func browser(ua string) string {
	switch {
	case strings.Contains(ua, "instagram"):
		return "Instagram"
	case strings.Contains(ua, "fban"), strings.Contains(ua, "fbav"):
		return "Facebook"
	case strings.Contains(ua, "edg/"), strings.Contains(ua, "edga/"), strings.Contains(ua, "edgios/"):
		return "Edge"
	case strings.Contains(ua, "opr/"), strings.Contains(ua, "opera"):
		return "Opera"
	case strings.Contains(ua, "samsungbrowser"):
		return "Samsung Internet"
	case strings.Contains(ua, "firefox"), strings.Contains(ua, "fxios"):
		return "Firefox"
	case strings.Contains(ua, "chrome"), strings.Contains(ua, "crios"):
		return "Chrome"
	case strings.Contains(ua, "safari"):
		return "Safari"
	default:
		return "Autre"
	}
}

// language keeps the primary subtag of the first preference: "fr-FR,fr;q=0.9" is "fr".
func language(header string) string {
	first := strings.TrimSpace(strings.Split(header, ",")[0])
	first = strings.TrimSpace(strings.Split(first, ";")[0])
	primary := strings.ToLower(strings.Split(first, "-")[0])
	if len(primary) < 2 || len(primary) > 3 || primary == "*" {
		return Unknown
	}
	for _, r := range primary {
		if r < 'a' || r > 'z' {
			return Unknown
		}
	}
	return primary
}

func referrerHost(referer string) string {
	if referer == "" {
		return Unknown
	}
	parsed, err := url.Parse(referer)
	if err != nil {
		return Unknown
	}
	return clip(strings.TrimPrefix(strings.ToLower(parsed.Hostname()), "www."), 120)
}
