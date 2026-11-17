package service

import (
	"bytes"
	"encoding/json"
	"net/mail"
	"net/url"
	"regexp"
	"strings"
	"unicode/utf8"
)

const (
	KindURL   = "url"
	KindText  = "text"
	KindVCard = "vcard"
	KindWifi  = "wifi"
	KindEmail = "email"
	KindPhone = "phone"
	KindSMS   = "sms"
)

var Kinds = []string{KindURL, KindText, KindVCard, KindWifi, KindEmail, KindPhone, KindSMS}

// IsDynamic: the printed code encodes /r/<slug>, so its content can change and its scans are counted. A Wi-Fi code
// must hold the WIFI: string itself for the camera to join the network, so it is static and untracked.
func IsDynamic(kind string) bool { return kind != KindWifi }

func ValidKind(kind string) bool {
	for _, k := range Kinds {
		if k == kind {
			return true
		}
	}
	return false
}

type URLContent struct {
	URL         string `json:"url"`
	UTMSource   string `json:"utm_source"`
	UTMMedium   string `json:"utm_medium"`
	UTMCampaign string `json:"utm_campaign"`
}

type TextContent struct {
	Text string `json:"text"`
}

type VCardContent struct {
	FirstName    string `json:"first_name"`
	LastName     string `json:"last_name"`
	Organization string `json:"organization"`
	Title        string `json:"title"`
	Phone        string `json:"phone"`
	Email        string `json:"email"`
	Website      string `json:"website"`
	Address      string `json:"address"`
	Note         string `json:"note"`
}

type WifiContent struct {
	SSID       string `json:"ssid"`
	Password   string `json:"password"`
	Encryption string `json:"encryption"`
	Hidden     bool   `json:"hidden"`
}

type EmailContent struct {
	To      string `json:"to"`
	Subject string `json:"subject"`
	Body    string `json:"body"`
}

type PhoneContent struct {
	Phone string `json:"phone"`
}

type SMSContent struct {
	Phone   string `json:"phone"`
	Message string `json:"message"`
}

var phonePattern = regexp.MustCompile(`^\+?[0-9][0-9 .\-()]{3,24}$`)

// NormalizeContent decodes strictly, trims, validates and re-encodes: what is stored is always the canonical form.
func NormalizeContent(kind string, raw json.RawMessage) (json.RawMessage, error) {
	switch kind {
	case KindURL:
		var c URLContent
		if err := decodeStrict(raw, &c); err != nil {
			return nil, err
		}
		target, err := NormalizeURL(c.URL)
		if err != nil {
			return nil, invalid("content.url", err.Error())
		}
		c.URL = target
		c.UTMSource, c.UTMMedium, c.UTMCampaign = clip(c.UTMSource, 80), clip(c.UTMMedium, 80), clip(c.UTMCampaign, 80)
		return json.Marshal(c)
	case KindText:
		var c TextContent
		if err := decodeStrict(raw, &c); err != nil {
			return nil, err
		}
		c.Text = strings.TrimSpace(c.Text)
		if c.Text == "" {
			return nil, invalid("content.text", "Le texte est obligatoire.")
		}
		if utf8.RuneCountInString(c.Text) > 2000 {
			return nil, invalid("content.text", "2000 caractères au maximum.")
		}
		return json.Marshal(c)
	case KindVCard:
		var c VCardContent
		if err := decodeStrict(raw, &c); err != nil {
			return nil, err
		}
		for _, field := range []*string{&c.FirstName, &c.LastName, &c.Organization, &c.Title, &c.Phone, &c.Email, &c.Website, &c.Address, &c.Note} {
			*field = clip(*field, 200)
		}
		if c.FirstName == "" && c.LastName == "" && c.Organization == "" {
			return nil, invalid("content.first_name", "Indiquez au moins un nom ou une organisation.")
		}
		if c.Email != "" && !validEmail(c.Email) {
			return nil, invalid("content.email", "Adresse e-mail invalide.")
		}
		if c.Phone != "" && !phonePattern.MatchString(c.Phone) {
			return nil, invalid("content.phone", "Numéro de téléphone invalide.")
		}
		if c.Website != "" {
			site, err := NormalizeURL(c.Website)
			if err != nil {
				return nil, invalid("content.website", err.Error())
			}
			c.Website = site
		}
		return json.Marshal(c)
	case KindWifi:
		var c WifiContent
		if err := decodeStrict(raw, &c); err != nil {
			return nil, err
		}
		c.SSID = strings.TrimSpace(c.SSID)
		if c.SSID == "" || len(c.SSID) > 32 {
			return nil, invalid("content.ssid", "Le nom du réseau est obligatoire (32 octets au maximum).")
		}
		switch c.Encryption {
		case "WPA", "WEP":
			if c.Password == "" || len(c.Password) > 63 {
				return nil, invalid("content.password", "Le mot de passe du réseau est obligatoire (63 caractères au maximum).")
			}
		case "nopass":
			c.Password = ""
		default:
			return nil, invalid("content.encryption", "Chiffrement inconnu.")
		}
		return json.Marshal(c)
	case KindEmail:
		var c EmailContent
		if err := decodeStrict(raw, &c); err != nil {
			return nil, err
		}
		c.To = strings.TrimSpace(c.To)
		if !validEmail(c.To) {
			return nil, invalid("content.to", "Adresse e-mail invalide.")
		}
		c.Subject, c.Body = clip(c.Subject, 200), clip(c.Body, 1000)
		return json.Marshal(c)
	case KindPhone:
		var c PhoneContent
		if err := decodeStrict(raw, &c); err != nil {
			return nil, err
		}
		c.Phone = strings.TrimSpace(c.Phone)
		if !phonePattern.MatchString(c.Phone) {
			return nil, invalid("content.phone", "Numéro de téléphone invalide.")
		}
		return json.Marshal(c)
	case KindSMS:
		var c SMSContent
		if err := decodeStrict(raw, &c); err != nil {
			return nil, err
		}
		c.Phone = strings.TrimSpace(c.Phone)
		if !phonePattern.MatchString(c.Phone) {
			return nil, invalid("content.phone", "Numéro de téléphone invalide.")
		}
		c.Message = clip(c.Message, 500)
		return json.Marshal(c)
	default:
		return nil, invalid("kind", "Type de QR code inconnu.")
	}
}

// NormalizeURL accepts "example.com" as https://example.com and refuses anything but http(s): a javascript: or
// data: target would run in the scanner's browser under our domain's redirect.
func NormalizeURL(raw string) (string, error) {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return "", errMessage("L'adresse est obligatoire.")
	}
	if len(raw) > 2048 {
		return "", errMessage("2048 caractères au maximum.")
	}
	if !strings.Contains(raw, "://") {
		raw = "https://" + raw
	}
	parsed, err := url.Parse(raw)
	if err != nil || parsed.Host == "" || strings.ContainsAny(parsed.Host, " <>\"") {
		return "", errMessage("Adresse invalide.")
	}
	scheme := strings.ToLower(parsed.Scheme)
	if scheme != "http" && scheme != "https" {
		return "", errMessage("Seules les adresses http et https sont acceptées.")
	}
	if !strings.Contains(parsed.Hostname(), ".") && parsed.Hostname() != "localhost" {
		return "", errMessage("Adresse invalide.")
	}
	parsed.Scheme = scheme
	return parsed.String(), nil
}

// NormalizeDesign keeps the design opaque (the web app owns its shape) but bounded: a logo travels inside it.
func NormalizeDesign(raw json.RawMessage) (json.RawMessage, error) {
	if len(bytes.TrimSpace(raw)) == 0 {
		return json.RawMessage(`{}`), nil
	}
	if len(raw) > MaxDesignBytes {
		return nil, invalid("design", "Le design est trop lourd (logo de 300 Ko au maximum).")
	}
	var object map[string]json.RawMessage
	if err := json.Unmarshal(raw, &object); err != nil {
		return nil, invalid("design", "Design invalide.")
	}
	return json.Marshal(object)
}

const MaxDesignBytes = 400 * 1024

func NormalizeName(name, kind string) (string, error) {
	name = strings.TrimSpace(name)
	if utf8.RuneCountInString(name) > 120 {
		return "", invalid("name", "120 caractères au maximum.")
	}
	if name == "" {
		name = KindLabel(kind)
	}
	return name, nil
}

func KindLabel(kind string) string {
	switch kind {
	case KindURL:
		return "Lien"
	case KindText:
		return "Texte"
	case KindVCard:
		return "Carte de visite"
	case KindWifi:
		return "Wi-Fi"
	case KindEmail:
		return "E-mail"
	case KindPhone:
		return "Appel"
	case KindSMS:
		return "SMS"
	}
	return "QR code"
}

// ValidatePassword: bcrypt reads 72 bytes at most, a longer password would silently match its own prefix.
func ValidatePassword(password string) error {
	if len(password) < 6 || len(password) > 72 {
		return invalid("password", "Entre 6 et 72 caractères.")
	}
	return nil
}

type messageError string

func (e messageError) Error() string { return string(e) }

func errMessage(message string) error { return messageError(message) }

func decodeStrict(raw json.RawMessage, into any) error {
	decoder := json.NewDecoder(bytes.NewReader(raw))
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(into); err != nil {
		return invalid("content", "Contenu invalide pour ce type.")
	}
	return nil
}

func validEmail(value string) bool {
	address, err := mail.ParseAddress(value)
	return err == nil && address.Address == value && strings.Contains(value, ".")
}

func clip(value string, max int) string {
	value = strings.TrimSpace(value)
	if utf8.RuneCountInString(value) <= max {
		return value
	}
	return string([]rune(value)[:max])
}
