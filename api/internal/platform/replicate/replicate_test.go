package replicate

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestClientCreatesPollsAndFetches(t *testing.T) {
	png := []byte("\x89PNG\r\n\x1a\n0000000000000000")
	var server *httptest.Server
	server = httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("Authorization") != "Bearer tok" {
			w.WriteHeader(http.StatusUnauthorized)
			return
		}
		switch {
		case r.Method == http.MethodPost && r.URL.Path == "/v1/predictions":
			var body map[string]any
			raw, _ := io.ReadAll(r.Body)
			_ = json.Unmarshal(raw, &body)
			if body["version"] != "v1" {
				w.WriteHeader(http.StatusBadRequest)
				return
			}
			_, _ = w.Write([]byte(`{"id":"p1","status":"starting"}`))
		case r.URL.Path == "/v1/predictions/p1":
			_, _ = w.Write([]byte(`{"id":"p1","status":"succeeded","output":["` + server.URL + `/files/out.png"]}`))
		case r.URL.Path == "/files/out.png":
			_, _ = w.Write(png)
		}
	}))
	defer server.Close()

	client := New("tok", "v1").WithBase(server.URL)
	ctx := context.Background()
	id, err := client.Start(ctx, map[string]any{"prompt": "x"})
	if err != nil || id != "p1" {
		t.Fatalf("start: %q %v", id, err)
	}
	p, err := client.Poll(ctx, id)
	if err != nil || p.Status != "succeeded" || len(p.Output) != 1 {
		t.Fatalf("poll: %+v %v", p, err)
	}
	body, kind, err := client.Fetch(ctx, p.Output[0])
	if err != nil || kind != "image/png" || len(body) != len(png) {
		t.Fatalf("fetch: %q %v", kind, err)
	}
	if _, _, err := client.Fetch(ctx, "https://evil.example/out.png"); err == nil {
		t.Fatal("token sent to a foreign host")
	}
}

func TestOutputsAndHosts(t *testing.T) {
	if got := Outputs(json.RawMessage(`"https://a/b.png"`)); len(got) != 1 {
		t.Fatalf("single: %v", got)
	}
	if got := Outputs(json.RawMessage(`null`)); got != nil {
		t.Fatalf("null: %v", got)
	}
	for raw, want := range map[string]bool{
		"https://replicate.delivery/pbxt/x.png":     true,
		"https://pbxt.replicate.delivery/x.png":     true,
		"http://replicate.delivery/x.png":           false,
		"https://replicate.delivery.evil.com/x.png": false,
	} {
		if AllowedFileHost(raw) != want {
			t.Errorf("%s: want %v", raw, want)
		}
	}
}
