package main

import (
	"embed"
	"errors"
	"log"
	"net/http"
	"os"
	"time"
	_ "time/tzdata" // so visitors' time zones resolve on servers without zoneinfo
)

//go:embed templates static
var content embed.FS

func main() {
	addr := envOr("ADDR", "127.0.0.1:8080")
	store, err := OpenStore(envOr("DB_PATH", "steps.db"))
	if err != nil {
		log.Fatal(err)
	}
	defer store.Close()

	handler, err := NewServer(store)
	if err != nil {
		log.Fatal(err)
	}

	srv := &http.Server{Addr: addr, Handler: handler, ReadHeaderTimeout: 5 * time.Second}
	log.Printf("step tracker listening on http://%s", addr)
	if err := srv.ListenAndServe(); !errors.Is(err, http.ErrServerClosed) {
		log.Fatal(err)
	}
}

func envOr(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
