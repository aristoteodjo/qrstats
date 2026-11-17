package service

import (
	"sort"
	"time"
)

const (
	MaxRangeDays     = 366
	DefaultRangeDays = 30
	BreakdownLimit   = 8
)

// Range is a span of whole calendar days in the reader's time zone, From and To included.
type Range struct {
	From     time.Time
	To       time.Time
	Location *time.Location
}

// Start and End are the instants bounding the range: End is the midnight after To, excluded.
func (r Range) Start() time.Time { return r.From }
func (r Range) End() time.Time   { return r.To.AddDate(0, 0, 1) }
func (r Range) Days() int        { return int(r.End().Sub(r.Start()).Hours()/24 + 0.5) }

// ParseRange defaults to the last 30 days ending today in the reader's zone. Dates are YYYY-MM-DD.
func ParseRange(from, to, tz string, now time.Time) (Range, error) {
	loc := time.UTC
	if tz != "" {
		loaded, err := time.LoadLocation(tz)
		if err != nil {
			return Range{}, invalid("tz", "Fuseau horaire inconnu.")
		}
		loc = loaded
	}
	local := now.In(loc)
	today := time.Date(local.Year(), local.Month(), local.Day(), 0, 0, 0, 0, loc)

	end := today
	if to != "" {
		parsed, err := time.ParseInLocation("2006-01-02", to, loc)
		if err != nil {
			return Range{}, invalid("to", "Date de fin invalide.")
		}
		end = parsed
	}
	start := end.AddDate(0, 0, -(DefaultRangeDays - 1))
	if from != "" {
		parsed, err := time.ParseInLocation("2006-01-02", from, loc)
		if err != nil {
			return Range{}, invalid("from", "Date de début invalide.")
		}
		start = parsed
	}
	r := Range{From: start, To: end, Location: loc}
	if start.After(end) {
		return Range{}, invalid("from", "La date de début doit précéder la date de fin.")
	}
	if r.Days() > MaxRangeDays {
		return Range{}, invalid("from", "Une période de 366 jours au maximum.")
	}
	return r, nil
}

// Previous is the period of the same length just before, for the comparison figures.
func (r Range) Previous() Range {
	days := r.Days()
	return Range{From: r.From.AddDate(0, 0, -days), To: r.From.AddDate(0, 0, -1), Location: r.Location}
}

type DayCount struct {
	Date    string `json:"date"`
	Scans   int64  `json:"scans"`
	Uniques int64  `json:"uniques"`
}

// FillSeries returns one point per day of the range, zero where nothing was scanned: a chart never skips a day.
func FillSeries(r Range, rows []DayCount) []DayCount {
	byDate := make(map[string]DayCount, len(rows))
	for _, row := range rows {
		byDate[row.Date] = row
	}
	out := make([]DayCount, 0, r.Days())
	for day := r.From; !day.After(r.To); day = day.AddDate(0, 0, 1) {
		key := day.Format("2006-01-02")
		point := byDate[key]
		point.Date = key
		out = append(out, point)
	}
	return out
}

type Bucket struct {
	Key   string `json:"key"`
	Count int64  `json:"count"`
}

// TopBuckets keeps the largest buckets and folds the rest into "other", so a chart stays readable.
// An empty key (unknown) is kept as such for the web app to label.
func TopBuckets(rows []Bucket, limit int) []Bucket {
	sorted := append([]Bucket(nil), rows...)
	sort.SliceStable(sorted, func(i, j int) bool {
		if sorted[i].Count != sorted[j].Count {
			return sorted[i].Count > sorted[j].Count
		}
		return sorted[i].Key < sorted[j].Key
	})
	if len(sorted) <= limit {
		return sorted
	}
	var rest int64
	for _, b := range sorted[limit-1:] {
		rest += b.Count
	}
	return append(sorted[:limit-1], Bucket{Key: "__other__", Count: rest})
}

// HourSeries spreads counts over the 24 hours of the day, zero-filled.
func HourSeries(rows []Bucket) []int64 {
	out := make([]int64, 24)
	for _, row := range rows {
		var hour int
		for _, r := range row.Key {
			hour = hour*10 + int(r-'0')
		}
		if hour >= 0 && hour < 24 {
			out[hour] += row.Count
		}
	}
	return out
}
