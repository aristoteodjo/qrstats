package service

import (
	"encoding/json"
	"net/url"
)

// Campaign is the UTM triple a scan is counted under.
type Campaign struct {
	Source   string
	Medium   string
	Campaign string
}

// ScanCampaign reads utm_* from the scanned URL (/r/<slug>?utm_source=flyer): one printed variant per channel can
// share a single QR code. Values are clipped like stored ones.
func ScanCampaign(query url.Values) Campaign {
	return Campaign{
		Source:   clip(query.Get("utm_source"), 80),
		Medium:   clip(query.Get("utm_medium"), 80),
		Campaign: clip(query.Get("utm_campaign"), 80),
	}
}

// ResolveTarget builds the URL a link code redirects to. Precedence per parameter: the scanned variant, then the
// code's defaults, then whatever the target URL already carried. It returns the campaign the scan is counted under.
func ResolveTarget(content URLContent, scan Campaign) (string, Campaign) {
	effective := Campaign{
		Source:   firstNonEmpty(scan.Source, content.UTMSource),
		Medium:   firstNonEmpty(scan.Medium, content.UTMMedium),
		Campaign: firstNonEmpty(scan.Campaign, content.UTMCampaign),
	}
	parsed, err := url.Parse(content.URL)
	if err != nil {
		return content.URL, effective
	}
	query := parsed.Query()
	for key, value := range map[string]string{
		"utm_source": effective.Source, "utm_medium": effective.Medium, "utm_campaign": effective.Campaign,
	} {
		if value != "" {
			query.Set(key, value)
		}
	}
	effective.Source = firstNonEmpty(effective.Source, query.Get("utm_source"))
	effective.Medium = firstNonEmpty(effective.Medium, query.Get("utm_medium"))
	effective.Campaign = firstNonEmpty(effective.Campaign, query.Get("utm_campaign"))
	parsed.RawQuery = query.Encode()
	return parsed.String(), effective
}

// LinkTarget decodes a stored link content; anything else has no direct target.
func LinkTarget(kind string, content json.RawMessage) (URLContent, bool) {
	if kind != KindURL {
		return URLContent{}, false
	}
	var c URLContent
	if err := json.Unmarshal(content, &c); err != nil || c.URL == "" {
		return URLContent{}, false
	}
	return c, true
}

func firstNonEmpty(values ...string) string {
	for _, v := range values {
		if v != "" {
			return v
		}
	}
	return ""
}
