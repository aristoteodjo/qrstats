package service

import (
	"bytes"
	"encoding/json"
	"fmt"
	"strings"
)

// A Rule sends some scanners of a link code elsewhere: "iPhones go to the App Store". Rules are tried in order;
// the first that matches wins, and no match means the code's own destination.
type Rule struct {
	Field string `json:"field" example:"os"`
	Value string `json:"value" example:"iOS"`
	URL   string `json:"url" example:"https://apps.apple.com/app/id000"`
}

const MaxRules = 10

var ruleValues = map[string][]string{
	"os":     {"iOS", "Android", "Windows", "macOS", "Linux", "ChromeOS"},
	"device": {DeviceMobile, DeviceTablet, DeviceDesktop},
}

// NormalizeRules validates rules for a kind. Only link codes have a destination to vary; any other kind keeps none.
func NormalizeRules(kind string, raw json.RawMessage) (json.RawMessage, error) {
	trimmed := bytes.TrimSpace(raw)
	if len(trimmed) == 0 || string(trimmed) == "null" {
		return json.RawMessage(`[]`), nil
	}
	var rules []Rule
	decoder := json.NewDecoder(bytes.NewReader(trimmed))
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&rules); err != nil {
		return nil, invalid("rules", "Règles de redirection invalides.")
	}
	if len(rules) == 0 {
		return json.RawMessage(`[]`), nil
	}
	if kind != KindURL {
		return nil, invalid("rules", "Seul un QR code de type lien peut rediriger selon l'appareil.")
	}
	if len(rules) > MaxRules {
		return nil, invalid("rules", fmt.Sprintf("%d règles au maximum.", MaxRules))
	}
	for i := range rules {
		field := fmt.Sprintf("rules.%d", i)
		r := &rules[i]
		r.Value = strings.TrimSpace(r.Value)
		switch r.Field {
		case "os", "device":
			value, ok := canonical(ruleValues[r.Field], r.Value)
			if !ok {
				return nil, invalid(field+".value", "Valeur inconnue pour ce critère.")
			}
			r.Value = value
		case "country":
			r.Value = strings.ToUpper(r.Value)
			if !isLetters(r.Value, 2) {
				return nil, invalid(field+".value", "Code pays à deux lettres (par exemple BJ, FR).")
			}
		case "language":
			r.Value = strings.ToLower(r.Value)
			if !isLetters(r.Value, 2) && !isLetters(r.Value, 3) {
				return nil, invalid(field+".value", "Code langue à deux lettres (par exemple fr, en).")
			}
		default:
			return nil, invalid(field+".field", "Critère inconnu.")
		}
		target, err := NormalizeURL(r.URL)
		if err != nil {
			return nil, invalid(field+".url", err.Error())
		}
		r.URL = target
	}
	return json.Marshal(rules)
}

// PickRule returns the destination of the first rule the scanner matches.
func PickRule(raw json.RawMessage, client Client, country string) (string, bool) {
	var rules []Rule
	if len(raw) == 0 || json.Unmarshal(raw, &rules) != nil {
		return "", false
	}
	for _, r := range rules {
		var actual string
		switch r.Field {
		case "os":
			actual = client.OS
		case "device":
			actual = client.Device
		case "country":
			actual = country
		case "language":
			actual = client.Language
		}
		if actual != "" && strings.EqualFold(actual, r.Value) {
			return r.URL, true
		}
	}
	return "", false
}

func canonical(allowed []string, value string) (string, bool) {
	for _, a := range allowed {
		if strings.EqualFold(a, value) {
			return a, true
		}
	}
	return "", false
}

func isLetters(value string, n int) bool {
	if len(value) != n {
		return false
	}
	for _, r := range strings.ToLower(value) {
		if r < 'a' || r > 'z' {
			return false
		}
	}
	return true
}
