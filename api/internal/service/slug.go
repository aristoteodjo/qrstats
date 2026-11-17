package service

import (
	"crypto/rand"
	"math/big"
	"regexp"
)

// No 0/O, 1/l/I: a slug may be typed from a printed flyer.
const slugAlphabet = "23456789abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ"

const SlugLength = 7

var slugPattern = regexp.MustCompile(`^[2-9a-zA-Z]{4,16}$`)

// NewSlug draws from crypto/rand: a guessable slug would let anyone walk through other people's codes.
func NewSlug() (string, error) {
	out := make([]byte, SlugLength)
	limit := big.NewInt(int64(len(slugAlphabet)))
	for i := range out {
		n, err := rand.Int(rand.Reader, limit)
		if err != nil {
			return "", err
		}
		out[i] = slugAlphabet[n.Int64()]
	}
	return string(out), nil
}

func ValidSlug(slug string) bool { return slugPattern.MatchString(slug) }
