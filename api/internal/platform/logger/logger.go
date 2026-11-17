package logger

import (
	"os"
	"time"

	"github.com/rs/zerolog"
)

func New(level string, development bool) zerolog.Logger {
	parsed, err := zerolog.ParseLevel(level)
	if err != nil || parsed == zerolog.NoLevel {
		parsed = zerolog.InfoLevel
	}

	if development {
		writer := zerolog.ConsoleWriter{Out: os.Stdout, TimeFormat: time.RFC3339}
		return zerolog.New(writer).Level(parsed).With().Timestamp().Logger()
	}

	return zerolog.New(os.Stdout).Level(parsed).With().Timestamp().Logger()
}
