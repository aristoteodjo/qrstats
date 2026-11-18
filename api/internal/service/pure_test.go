package service

import (
	"encoding/json"
	"errors"
	"net/http"
	"net/url"
	"strings"
	"testing"
	"time"
)

func TestNewSlugIsValidAndVaries(t *testing.T) {
	seen := map[string]bool{}
	for i := 0; i < 200; i++ {
		slug, err := NewSlug()
		if err != nil {
			t.Fatal(err)
		}
		if !ValidSlug(slug) || len(slug) != SlugLength || strings.ContainsAny(slug, "0O1lI") {
			t.Fatalf("bad slug %q", slug)
		}
		seen[slug] = true
	}
	if len(seen) < 195 {
		t.Fatalf("slugs repeat too often: %d distinct", len(seen))
	}
	for _, bad := range []string{"", "abc", "../etc", "abc def", strings.Repeat("a", 17)} {
		if ValidSlug(bad) {
			t.Errorf("%q should be invalid", bad)
		}
	}
}

func TestNormalizeURL(t *testing.T) {
	cases := map[string]string{
		"example.com":                 "https://example.com",
		" HTTP://example.com/a?b=1 ":  "http://example.com/a?b=1",
		"https://sub.example.co/path": "https://sub.example.co/path",
	}
	for in, want := range cases {
		got, err := NormalizeURL(in)
		if err != nil || got != want {
			t.Errorf("NormalizeURL(%q) = %q, %v; want %q", in, got, err, want)
		}
	}
	for _, bad := range []string{"", "javascript:alert(1)", "javascript://example.com/%0aalert(1)", "data:text/html,x", "ftp://example.com", "https://", "nodot", strings.Repeat("a", 2050)} {
		if _, err := NormalizeURL(bad); err == nil {
			t.Errorf("NormalizeURL(%q) should fail", bad)
		}
	}
}

func TestNormalizeContentPerKind(t *testing.T) {
	ok := map[string]string{
		KindURL:   `{"url":"example.com","utm_source":" flyer "}`,
		KindText:  `{"text":" Bonjour "}`,
		KindVCard: `{"first_name":"Awa","email":"awa@example.com","website":"awa.dev"}`,
		KindWifi:  `{"ssid":"Maison","password":"secret123","encryption":"WPA","hidden":false}`,
		KindEmail: `{"to":"contact@example.com","subject":"Salut"}`,
		KindPhone: `{"phone":"+229 97 00 00 00"}`,
		KindSMS:   `{"phone":"+22997000000","message":"Oui"}`,
	}
	for kind, raw := range ok {
		if _, err := NormalizeContent(kind, json.RawMessage(raw)); err != nil {
			t.Errorf("%s: unexpected error %v", kind, err)
		}
	}
	got, _ := NormalizeContent(KindURL, json.RawMessage(ok[KindURL]))
	if !strings.Contains(string(got), `"url":"https://example.com"`) || !strings.Contains(string(got), `"utm_source":"flyer"`) {
		t.Errorf("url content not canonical: %s", got)
	}

	bad := map[string]string{
		KindURL:   `{"url":"javascript:alert(1)"}`,
		KindText:  `{"text":"   "}`,
		KindVCard: `{"note":"no name"}`,
		KindWifi:  `{"ssid":"Maison","encryption":"WPA"}`,
		KindEmail: `{"to":"not-an-email"}`,
		KindPhone: `{"phone":"abc"}`,
		KindSMS:   `{"phone":"+229","extra":1}`,
		"unknown": `{}`,
	}
	for kind, raw := range bad {
		_, err := NormalizeContent(kind, json.RawMessage(raw))
		var validation *ValidationError
		if !errors.As(err, &validation) {
			t.Errorf("%s: want a ValidationError, got %v", kind, err)
		}
	}
}

func TestNormalizeDesign(t *testing.T) {
	if got, err := NormalizeDesign(nil); err != nil || string(got) != "{}" {
		t.Fatalf("empty design = %s, %v", got, err)
	}
	if _, err := NormalizeDesign(json.RawMessage(`[1,2]`)); err == nil {
		t.Fatal("an array is not a design")
	}
	big := `{"logo":"` + strings.Repeat("a", MaxDesignBytes) + `"}`
	if _, err := NormalizeDesign(json.RawMessage(big)); err == nil {
		t.Fatal("an oversized design must be refused")
	}
}

func TestResolveTargetPrecedence(t *testing.T) {
	content := URLContent{URL: "https://shop.example.com/p?utm_source=old&ref=1", UTMSource: "qr", UTMCampaign: "summer"}

	target, campaign := ResolveTarget(content, Campaign{})
	parsed, _ := url.Parse(target)
	q := parsed.Query()
	if q.Get("utm_source") != "qr" || q.Get("utm_campaign") != "summer" || q.Get("ref") != "1" {
		t.Fatalf("defaults not applied: %s", target)
	}
	if campaign.Source != "qr" || campaign.Campaign != "summer" {
		t.Fatalf("campaign = %+v", campaign)
	}

	target, campaign = ResolveTarget(content, Campaign{Source: "flyer", Medium: "print"})
	parsed, _ = url.Parse(target)
	if parsed.Query().Get("utm_source") != "flyer" || parsed.Query().Get("utm_medium") != "print" || campaign.Source != "flyer" {
		t.Fatalf("scan variant must win: %s %+v", target, campaign)
	}

	target, campaign = ResolveTarget(URLContent{URL: "https://a.example/?utm_source=kept"}, Campaign{})
	if !strings.Contains(target, "utm_source=kept") || campaign.Source != "kept" {
		t.Fatalf("existing parameter lost: %s %+v", target, campaign)
	}
}

func TestParseClient(t *testing.T) {
	cases := []struct {
		ua                     string
		device, os, browserWas string
	}{
		{"Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1", DeviceMobile, "iOS", "Safari"},
		{"Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Mobile Safari/537.36", DeviceMobile, "Android", "Chrome"},
		{"Mozilla/5.0 (Linux; Android 13; SM-X200) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/23.0 Chrome/115.0 Safari/537.36", DeviceTablet, "Android", "Samsung Internet"},
		{"Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/120.0 Mobile/15E148 Safari/604.1", DeviceTablet, "iOS", "Chrome"},
		{"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36 Edg/120.0", DeviceDesktop, "Windows", "Edge"},
		{"Mozilla/5.0 (Macintosh; Intel Mac OS X 14.0; rv:121.0) Gecko/20100101 Firefox/121.0", DeviceDesktop, "macOS", "Firefox"},
		{"Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Mobile/15E148 Instagram 300.0", DeviceMobile, "iOS", "Instagram"},
	}
	for _, c := range cases {
		got := ParseClient(c.ua, "fr-FR,fr;q=0.9,en;q=0.8", "https://www.Example.com/page")
		if got.Device != c.device || got.OS != c.os || got.Browser != c.browserWas {
			t.Errorf("%s\n got %+v", c.ua, got)
		}
		if got.Language != "fr" || got.Referrer != "example.com" {
			t.Errorf("language/referrer = %q/%q", got.Language, got.Referrer)
		}
	}
	if ParseClient("x", "*", "").Language != "" || ParseClient("x", "", "").Language != "" {
		t.Error("unknown language must be empty")
	}
}

func TestIsBot(t *testing.T) {
	for _, ua := range []string{"", "WhatsApp/2.23.20.0", "facebookexternalhit/1.1", "Googlebot/2.1", "curl/8.4.0", "Mozilla/5.0 HeadlessChrome/120.0", "TelegramBot (like TwitterBot)"} {
		if !IsBot(ua) {
			t.Errorf("%q should be a bot", ua)
		}
	}
	if IsBot("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Safari/604.1") {
		t.Error("a phone is not a bot")
	}
}

func TestVisitorHashRotatesDailyAndHidesIP(t *testing.T) {
	day := time.Date(2026, 11, 18, 10, 0, 0, 0, time.UTC)
	a := VisitorHash("secret", "203.0.113.7", "ua", day)
	if a != VisitorHash("secret", "203.0.113.7", "ua", day.Add(5*time.Hour)) {
		t.Fatal("same visitor, same day must hash the same")
	}
	if a == VisitorHash("secret", "203.0.113.7", "ua", day.Add(24*time.Hour)) {
		t.Fatal("the hash must change the next day")
	}
	if a == VisitorHash("other", "203.0.113.7", "ua", day) || strings.Contains(a, "203") || len(a) != 32 {
		t.Fatal("the hash must depend on the secret and not reveal the IP")
	}
}

func TestClientIPAndLocationTrustOnlyBehindProxy(t *testing.T) {
	h := http.Header{}
	h.Set("X-Forwarded-For", "198.51.100.1, 10.0.0.1")
	h.Set("X-Vercel-IP-Country", "bj")
	h.Set("X-Vercel-IP-City", "Cotonou%20Centre")
	h.Set("X-Vercel-Forwarded-For", "203.0.113.9")
	if got := ClientIP(h, "10.0.0.2:5555", ""); got != "10.0.0.2" {
		t.Fatalf("untrusted ClientIP = %q", got)
	}
	if got := ClientIP(h, "10.0.0.2:5555", "X-Vercel-Forwarded-For"); got != "203.0.113.9" {
		t.Fatalf("edge header ClientIP = %q", got)
	}
	h.Del("X-Vercel-Forwarded-For")
	if got := ClientIP(h, "10.0.0.2:5555", "X-Vercel-Forwarded-For"); got != "10.0.0.2" {
		t.Fatalf("a forged X-Forwarded-For must be ignored, got %q", got)
	}
	if c, city := Location(h, false); c != "" || city != "" {
		t.Fatal("untrusted location must be empty")
	}
	if c, city := Location(h, true); c != "BJ" || city != "Cotonou Centre" {
		t.Fatalf("location = %q %q", c, city)
	}
}

func TestLimiter(t *testing.T) {
	now := time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC)
	l := NewLimiter(2, time.Minute, func() time.Time { return now })
	if !l.Allow("a") || !l.Allow("a") || l.Allow("a") {
		t.Fatal("third attempt in the window must be refused")
	}
	if !l.Allow("b") {
		t.Fatal("keys are independent")
	}
	now = now.Add(time.Minute)
	if !l.Allow("a") {
		t.Fatal("a new window allows again")
	}
}

func TestParseRange(t *testing.T) {
	now := time.Date(2026, 11, 18, 23, 30, 0, 0, time.UTC)
	r, err := ParseRange("", "", "Africa/Porto-Novo", now)
	if err != nil {
		t.Fatal(err)
	}
	// 23:30 UTC is already the 19th in Porto-Novo (UTC+1).
	if r.To.Format("2006-01-02") != "2026-11-19" || r.Days() != DefaultRangeDays {
		t.Fatalf("default range = %s..%s (%d days)", r.From, r.To, r.Days())
	}
	if r.End().Sub(r.Start()) != time.Duration(DefaultRangeDays)*24*time.Hour {
		t.Fatal("bounds must cover whole days")
	}
	prev := r.Previous()
	if prev.Days() != r.Days() || !prev.End().Equal(r.Start()) {
		t.Fatalf("previous = %s..%s", prev.From, prev.To)
	}
	for _, c := range [][3]string{{"2026-02-01", "2026-01-01", ""}, {"2024-01-01", "2026-01-01", ""}, {"x", "", ""}, {"", "", "Mars/Olympus"}} {
		if _, err := ParseRange(c[0], c[1], c[2], now); err == nil {
			t.Errorf("ParseRange(%v) should fail", c)
		}
	}
}

func TestFillSeriesAndBuckets(t *testing.T) {
	r, _ := ParseRange("2026-11-01", "2026-11-03", "UTC", time.Now())
	series := FillSeries(r, []DayCount{{Date: "2026-11-02", Scans: 4, Uniques: 3}})
	if len(series) != 3 || series[0].Scans != 0 || series[1].Scans != 4 || series[2].Date != "2026-11-03" {
		t.Fatalf("series = %+v", series)
	}
	top := TopBuckets([]Bucket{{"a", 1}, {"b", 5}, {"c", 3}, {"d", 2}}, 3)
	if len(top) != 3 || top[0].Key != "b" || top[2].Key != "__other__" || top[2].Count != 3 {
		t.Fatalf("top = %+v", top)
	}
	if empty := TopBuckets(nil, 3); empty == nil || len(empty) != 0 {
		t.Fatalf("an empty breakdown must be [], got %#v", empty)
	}
	hours := HourSeries([]Bucket{{"0", 2}, {"23", 1}, {"9", 4}})
	if len(hours) != 24 || hours[0] != 2 || hours[9] != 4 || hours[23] != 1 {
		t.Fatalf("hours = %v", hours)
	}
}
