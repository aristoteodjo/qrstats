package service

import (
	"context"
	"net/http"
	"net/url"
	"time"

	"github.com/google/uuid"

	"qrstats/internal/model"
)

type StatsQuery struct {
	Owner string
	// QRCodeID narrows to one code; empty means every code of the owner.
	QRCodeID string
	Range    Range
}

// Dimensions a breakdown can be asked for. The store maps each to a column; nothing else reaches SQL.
var Dimensions = []string{"device", "os", "browser", "country", "city", "referrer", "language", "utm_source", "utm_medium", "utm_campaign"}

type StatsRows struct {
	Scans      int64
	Uniques    int64
	Previous   DayCount
	Days       []DayCount
	Hours      []Bucket
	Weekdays   []Bucket
	Dimensions map[string][]Bucket
	TopCodes   []TopCode
}

type TopCode struct {
	ID    string `json:"id"`
	Name  string `json:"name"`
	Kind  string `json:"kind"`
	Scans int64  `json:"scans"`
}

type ScanStore interface {
	Insert(ctx context.Context, scan *model.Scan) error
	Stats(ctx context.Context, query StatsQuery) (StatsRows, error)
}

type Scans struct {
	store    ScanStore
	secret   string
	trust    bool
	ipHeader string
	now      func() time.Time
}

func NewScans(store ScanStore, visitorSecret string, trustProxyHeaders bool, ipHeader string, now func() time.Time) *Scans {
	if now == nil {
		now = time.Now
	}
	if !trustProxyHeaders {
		ipHeader = ""
	}
	return &Scans{store: store, secret: visitorSecret, trust: trustProxyHeaders, ipHeader: ipHeader, now: now}
}

// ScanRequest is the part of an HTTP request a scan is made of.
type ScanRequest struct {
	Header     http.Header
	RemoteAddr string
	Query      url.Values
}

// BuildScan turns a request into a scan, or nil for a bot. The campaign is the one the redirect resolved.
func (s *Scans) BuildScan(qr *model.QRCode, req ScanRequest, campaign Campaign) *model.Scan {
	userAgent := req.Header.Get("User-Agent")
	if IsBot(userAgent) {
		return nil
	}
	at := s.now().UTC()
	client := ParseClient(userAgent, req.Header.Get("Accept-Language"), req.Header.Get("Referer"))
	country, city := Location(req.Header, s.trust)
	id, err := uuid.NewV7()
	if err != nil {
		return nil
	}
	return &model.Scan{
		ID: id.String(), QRCodeID: qr.ID, At: at,
		Visitor: VisitorHash(s.secret, ClientIP(req.Header, req.RemoteAddr, s.ipHeader), userAgent, at),
		Device:  client.Device, OS: client.OS, Browser: client.Browser, Language: client.Language,
		Referrer: client.Referrer, Country: country, City: city,
		UTMSource: campaign.Source, UTMMedium: campaign.Medium, UTMCampaign: campaign.Campaign,
	}
}

func (s *Scans) Record(ctx context.Context, scan *model.Scan) error {
	if scan == nil {
		return nil
	}
	return s.store.Insert(ctx, scan)
}

type Stats struct {
	From       string              `json:"from"`
	To         string              `json:"to"`
	Scans      int64               `json:"scans"`
	Uniques    int64               `json:"uniques"`
	Previous   DayCount            `json:"previous"`
	Series     []DayCount          `json:"series"`
	Hours      []int64             `json:"hours"`
	Weekdays   []int64             `json:"weekdays"`
	Breakdowns map[string][]Bucket `json:"breakdowns"`
	TopCodes   []TopCode           `json:"top_codes"`
}

func (s *Scans) Stats(ctx context.Context, query StatsQuery) (Stats, error) {
	rows, err := s.store.Stats(ctx, query)
	if err != nil {
		return Stats{}, err
	}
	breakdowns := make(map[string][]Bucket, len(rows.Dimensions))
	for name, buckets := range rows.Dimensions {
		breakdowns[name] = TopBuckets(buckets, BreakdownLimit)
	}
	topCodes := rows.TopCodes
	if topCodes == nil {
		topCodes = []TopCode{}
	}
	weekdays := make([]int64, 7)
	for _, b := range rows.Weekdays {
		if len(b.Key) == 1 && b.Key[0] >= '0' && b.Key[0] <= '6' {
			// Postgres isodow 1..7 (Monday first) arrives as 0..6.
			weekdays[b.Key[0]-'0'] += b.Count
		}
	}
	return Stats{
		From: query.Range.From.Format("2006-01-02"), To: query.Range.To.Format("2006-01-02"),
		Scans: rows.Scans, Uniques: rows.Uniques, Previous: rows.Previous,
		Series: FillSeries(query.Range, rows.Days), Hours: HourSeries(rows.Hours), Weekdays: weekdays,
		Breakdowns: breakdowns, TopCodes: topCodes,
	}, nil
}
