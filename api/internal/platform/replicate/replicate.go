// Package replicate is a minimal client for Replicate predictions: create, poll, and download the output file.
package replicate

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"

	"qrstats/internal/service"
)

type Client struct {
	token   string
	version string
	base    string
	http    *http.Client
}

func New(token, version string) *Client {
	return &Client{token: token, version: version, base: "https://api.replicate.com", http: &http.Client{Timeout: 25 * time.Second}}
}

// WithBase points the client at another server (tests).
func (c *Client) WithBase(base string) *Client {
	c.base = strings.TrimSuffix(base, "/")
	return c
}

type prediction struct {
	ID     string          `json:"id"`
	Status string          `json:"status"`
	Output json.RawMessage `json:"output"`
	Error  any             `json:"error"`
}

func (c *Client) do(ctx context.Context, method, path string, body any) (*prediction, error) {
	var reader io.Reader
	if body != nil {
		raw, err := json.Marshal(body)
		if err != nil {
			return nil, err
		}
		reader = bytes.NewReader(raw)
	}
	req, err := http.NewRequestWithContext(ctx, method, c.base+path, reader)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+c.token)
	req.Header.Set("Content-Type", "application/json")
	res, err := c.http.Do(req)
	if err != nil {
		return nil, err
	}
	defer res.Body.Close()
	raw, err := io.ReadAll(io.LimitReader(res.Body, 1<<20))
	if err != nil {
		return nil, err
	}
	if res.StatusCode >= 300 {
		return nil, fmt.Errorf("replicate %s %s: %d %s", method, path, res.StatusCode, strings.TrimSpace(string(raw)))
	}
	var out prediction
	if err := json.Unmarshal(raw, &out); err != nil {
		return nil, fmt.Errorf("replicate: decode: %w", err)
	}
	return &out, nil
}

func (c *Client) Start(ctx context.Context, input map[string]any) (string, error) {
	out, err := c.do(ctx, http.MethodPost, "/v1/predictions", map[string]any{"version": c.version, "input": input})
	if err != nil {
		return "", err
	}
	if out.ID == "" {
		return "", fmt.Errorf("replicate: prediction without id")
	}
	return out.ID, nil
}

func (c *Client) Poll(ctx context.Context, id string) (service.Prediction, error) {
	out, err := c.do(ctx, http.MethodGet, "/v1/predictions/"+url.PathEscape(id), nil)
	if err != nil {
		return service.Prediction{}, err
	}
	result := service.Prediction{Status: out.Status, Output: Outputs(out.Output)}
	if out.Error != nil {
		result.Error = fmt.Sprint(out.Error)
	}
	return result, nil
}

// Outputs reads a model output that is either one file URL or a list of them.
func Outputs(raw json.RawMessage) []string {
	var many []string
	if json.Unmarshal(raw, &many) == nil {
		return many
	}
	var one string
	if json.Unmarshal(raw, &one) == nil && one != "" {
		return []string{one}
	}
	return nil
}

// AllowedFileHost keeps the API token from being sent anywhere but Replicate's own file hosts.
func AllowedFileHost(raw string) bool {
	parsed, err := url.Parse(raw)
	if err != nil || parsed.Scheme != "https" {
		return false
	}
	host := parsed.Hostname()
	return host == "replicate.delivery" || strings.HasSuffix(host, ".replicate.delivery") || host == "api.replicate.com"
}

func (c *Client) Fetch(ctx context.Context, fileURL string) ([]byte, string, error) {
	if !AllowedFileHost(fileURL) && !strings.HasPrefix(fileURL, c.base+"/") {
		return nil, "", fmt.Errorf("replicate: unexpected file host in %q", fileURL)
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, fileURL, nil)
	if err != nil {
		return nil, "", err
	}
	req.Header.Set("Authorization", "Bearer "+c.token)
	res, err := c.http.Do(req)
	if err != nil {
		return nil, "", err
	}
	defer res.Body.Close()
	if res.StatusCode != http.StatusOK {
		return nil, "", fmt.Errorf("replicate: file %d", res.StatusCode)
	}
	body, err := io.ReadAll(io.LimitReader(res.Body, service.ArtImageMax+1))
	if err != nil {
		return nil, "", err
	}
	if len(body) > service.ArtImageMax {
		return nil, "", fmt.Errorf("replicate: file over %d bytes", service.ArtImageMax)
	}
	contentType := http.DetectContentType(body)
	if !strings.HasPrefix(contentType, "image/") {
		return nil, "", fmt.Errorf("replicate: file is %s, not an image", contentType)
	}
	return body, contentType, nil
}
