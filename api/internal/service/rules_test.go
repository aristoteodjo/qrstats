package service

import (
	"encoding/json"
	"errors"
	"strings"
	"testing"
)

func TestNormalizeRules(t *testing.T) {
	got, err := NormalizeRules(KindURL, json.RawMessage(`[
		{"field":"os","value":"ios","url":"apps.apple.com/app/id1"},
		{"field":"country","value":"bj","url":"https://example.bj"},
		{"field":"language","value":"EN","url":"https://example.com/en"}
	]`))
	if err != nil {
		t.Fatal(err)
	}
	s := string(got)
	for _, want := range []string{`"value":"iOS"`, `"url":"https://apps.apple.com/app/id1"`, `"value":"BJ"`, `"value":"en"`} {
		if !strings.Contains(s, want) {
			t.Errorf("%s missing in %s", want, s)
		}
	}
	if got, _ := NormalizeRules(KindText, nil); string(got) != "[]" {
		t.Errorf("no rules = [], got %s", got)
	}

	bad := map[string]string{
		"unknown field": `[{"field":"browser","value":"x","url":"https://a.co"}]`,
		"unknown os":    `[{"field":"os","value":"Symbian","url":"https://a.co"}]`,
		"bad country":   `[{"field":"country","value":"Benin","url":"https://a.co"}]`,
		"bad url":       `[{"field":"device","value":"mobile","url":"javascript:alert(1)"}]`,
		"extra key":     `[{"field":"device","value":"mobile","url":"https://a.co","x":1}]`,
		"not a list":    `{"field":"os"}`,
		"too many":      "[" + strings.TrimSuffix(strings.Repeat(`{"field":"device","value":"mobile","url":"https://a.co"},`, MaxRules+1), ",") + "]",
	}
	for name, raw := range bad {
		var validation *ValidationError
		if _, err := NormalizeRules(KindURL, json.RawMessage(raw)); !errors.As(err, &validation) {
			t.Errorf("%s: want a ValidationError, got %v", name, err)
		}
	}
	if _, err := NormalizeRules(KindText, json.RawMessage(`[{"field":"device","value":"mobile","url":"https://a.co"}]`)); err == nil {
		t.Error("only link codes take rules")
	}
}

func TestPickRule(t *testing.T) {
	rules := json.RawMessage(`[
		{"field":"os","value":"iOS","url":"https://apple.example"},
		{"field":"country","value":"BJ","url":"https://bj.example"},
		{"field":"device","value":"desktop","url":"https://desk.example"}
	]`)
	iphone := Client{OS: "iOS", Device: DeviceMobile}
	if url, ok := PickRule(rules, iphone, "BJ"); !ok || url != "https://apple.example" {
		t.Fatalf("first match wins, got %q", url)
	}
	android := Client{OS: "Android", Device: DeviceMobile}
	if url, _ := PickRule(rules, android, "BJ"); url != "https://bj.example" {
		t.Fatalf("country rule, got %q", url)
	}
	if _, ok := PickRule(rules, android, ""); ok {
		t.Fatal("no match keeps the code's destination")
	}
	if _, ok := PickRule(nil, iphone, "BJ"); ok {
		t.Fatal("no rules, no match")
	}
}
