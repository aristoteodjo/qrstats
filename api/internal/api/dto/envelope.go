package dto

import (
	"strconv"

	"github.com/gin-gonic/gin"
)

const (
	DefaultPerPage = 25
	MaxPerPage     = 100
)

// ErrorResponse is the one error shape: a message for people, a code for programs, the field when one is at fault.
type ErrorResponse struct {
	Error string `json:"error" example:"Adresse invalide."`
	Code  string `json:"code" example:"invalid"`
	Field string `json:"field,omitempty" example:"content.url"`
}

func Error(c *gin.Context, status int, code, message string) {
	c.AbortWithStatusJSON(status, ErrorResponse{Error: message, Code: code})
}

func FieldError(c *gin.Context, status int, field, message string) {
	c.AbortWithStatusJSON(status, ErrorResponse{Error: message, Code: "invalid", Field: field})
}

type Page[T any] struct {
	Data    []T   `json:"data"`
	Total   int64 `json:"total"`
	Page    int   `json:"page"`
	PerPage int   `json:"per_page"`
	Pages   int   `json:"pages"`
}

func NewPage[T any](data []T, total int64, page, perPage int) Page[T] {
	if data == nil {
		data = []T{}
	}
	pages := 0
	if total > 0 {
		pages = int((total + int64(perPage) - 1) / int64(perPage))
	}
	return Page[T]{Data: data, Total: total, Page: page, PerPage: perPage, Pages: pages}
}

// ParsePagination never fails: an unusable value falls back to the default.
func ParsePagination(c *gin.Context) (page, perPage int) {
	page, perPage = 1, DefaultPerPage
	if v, err := strconv.Atoi(c.Query("page")); err == nil && v > 0 {
		page = v
	}
	if v, err := strconv.Atoi(c.Query("per_page")); err == nil && v > 0 {
		perPage = min(v, MaxPerPage)
	}
	return page, perPage
}
