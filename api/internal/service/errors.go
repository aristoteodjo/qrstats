package service

import "errors"

var (
	ErrNotFound      = errors.New("not found")
	ErrLocked        = errors.New("locked")
	ErrWrongPassword = errors.New("wrong password")
	ErrPaused        = errors.New("paused")
	ErrTooManyTries  = errors.New("too many attempts")
)

// ValidationError names the field at fault so the form can show the message next to it.
type ValidationError struct {
	Field   string
	Message string
}

func (e *ValidationError) Error() string { return e.Field + ": " + e.Message }

func invalid(field, message string) error { return &ValidationError{Field: field, Message: message} }
