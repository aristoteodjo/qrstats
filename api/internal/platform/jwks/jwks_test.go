package jwks

import (
	"context"
	"crypto/ed25519"
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

func TestVerify(t *testing.T) {
	public, private, _ := ed25519.GenerateKey(rand.Reader)
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		_ = json.NewEncoder(w).Encode(map[string]any{"keys": []map[string]string{{
			"kid": "k1", "kty": "OKP", "crv": "Ed25519", "x": base64.RawURLEncoding.EncodeToString(public),
		}}})
	}))
	defer server.Close()
	v := New(server.URL, "http://web", "qrstats-api")

	sign := func(claims jwt.MapClaims, kid string, key ed25519.PrivateKey) string {
		token := jwt.NewWithClaims(jwt.SigningMethodEdDSA, claims)
		token.Header["kid"] = kid
		raw, err := token.SignedString(key)
		if err != nil {
			t.Fatal(err)
		}
		return raw
	}
	valid := jwt.MapClaims{"sub": "user-1", "iss": "http://web", "aud": "qrstats-api", "exp": time.Now().Add(time.Minute).Unix()}

	claims, err := v.Verify(context.Background(), sign(valid, "k1", private))
	if err != nil || claims.Subject != "user-1" {
		t.Fatalf("valid token refused: %v", err)
	}

	_, other, _ := ed25519.GenerateKey(rand.Reader)
	bad := map[string]string{
		"foreign key":    sign(valid, "k1", other),
		"wrong audience": sign(jwt.MapClaims{"sub": "u", "iss": "http://web", "aud": "other", "exp": valid["exp"]}, "k1", private),
		"wrong issuer":   sign(jwt.MapClaims{"sub": "u", "iss": "http://evil", "aud": "qrstats-api", "exp": valid["exp"]}, "k1", private),
		"expired":        sign(jwt.MapClaims{"sub": "u", "iss": "http://web", "aud": "qrstats-api", "exp": time.Now().Add(-time.Hour).Unix()}, "k1", private),
		"no expiry":      sign(jwt.MapClaims{"sub": "u", "iss": "http://web", "aud": "qrstats-api"}, "k1", private),
		"no subject":     sign(jwt.MapClaims{"iss": "http://web", "aud": "qrstats-api", "exp": valid["exp"]}, "k1", private),
		"garbage":        "a.b.c",
	}
	for name, raw := range bad {
		if _, err := v.Verify(context.Background(), raw); err == nil {
			t.Errorf("%s: accepted", name)
		}
	}
	hs := jwt.NewWithClaims(jwt.SigningMethodHS256, valid)
	hs.Header["kid"] = "k1"
	raw, _ := hs.SignedString([]byte("secret"))
	if _, err := v.Verify(context.Background(), raw); err == nil {
		t.Error("HS256 must be refused")
	}
}
