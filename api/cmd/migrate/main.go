package main

import (
	"fmt"
	"os"

	"qrstats/internal/config"
	"qrstats/internal/model"
	"qrstats/internal/platform/database"
)

// Applies the schema once, before a deployment: serverless instances never migrate on their own.
func main() {
	cfg, err := config.Load()
	if err == nil {
		var db, openErr = database.Open(cfg.DatabaseURL, false)
		err = openErr
		if err == nil {
			err = model.Migrate(db)
		}
	}
	if err != nil {
		fmt.Fprintf(os.Stderr, "migrate failed: %v\n", err)
		os.Exit(1)
	}
	fmt.Println("migrated")
}
