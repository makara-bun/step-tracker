package main

import (
	"context"
	"fmt"
	"html/template"
	"io/fs"
	"log"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"
)

// Server renders full pages for normal requests and just the #view fragment for htmx.
type Server struct {
	store *Store
	tmpl  *template.Template
	now   func() time.Time
}

func NewServer(store *Store) (http.Handler, error) {
	tmpl, err := template.New("").Funcs(template.FuncMap{"commas": commas, "plural": plural, "pose": newPose}).ParseFS(content, "templates/*.html")
	if err != nil {
		return nil, fmt.Errorf("parse templates: %w", err)
	}
	s := &Server{store: store, tmpl: tmpl, now: time.Now}
	return s.routes()
}

func (s *Server) routes() (http.Handler, error) {
	static, err := fs.Sub(content, "static")
	if err != nil {
		return nil, err
	}
	mux := http.NewServeMux()
	mux.Handle("GET /static/", http.StripPrefix("/static/", http.FileServerFS(static)))
	// The service worker has to come from the root to control every page.
	mux.HandleFunc("GET /sw.js", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Cache-Control", "no-cache")
		http.ServeFileFS(w, r, static, "sw.js")
	})
	mux.HandleFunc("GET /manifest.webmanifest", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/manifest+json")
		http.ServeFileFS(w, r, static, "manifest.webmanifest")
	})

	mux.HandleFunc("GET /{$}", s.today)
	mux.HandleFunc("GET /day/{date}", s.day)
	mux.HandleFunc("POST /day/{date}/steps", s.setSteps)
	mux.HandleFunc("POST /day/{date}/add", s.addSteps)
	mux.HandleFunc("POST /goal", s.setGoal)
	mux.HandleFunc("POST /walker", s.setWalker)
	mux.HandleFunc("GET /clear", s.confirmClear)
	mux.HandleFunc("POST /clear", s.clearAll)
	mux.HandleFunc("GET /month/{ym}", s.month)
	mux.HandleFunc("GET /year/{year}", s.year)

	return http.NewCrossOriginProtection().Handler(mux), nil
}

// todayFor resolves "today" in the visitor's time zone, which app.js stores in a cookie.
func (s *Server) todayFor(r *http.Request) time.Time {
	loc := time.Local
	if c, err := r.Cookie("tz"); err == nil {
		if name, err := url.QueryUnescape(c.Value); err == nil {
			if l, err := time.LoadLocation(name); err == nil {
				loc = l
			}
		}
	}
	y, m, d := s.now().In(loc).Date()
	return time.Date(y, m, d, 0, 0, 0, 0, time.UTC)
}

func (s *Server) today(w http.ResponseWriter, r *http.Request) {
	s.renderDay(w, r, s.todayFor(r), dayOptions{})
}

func (s *Server) day(w http.ResponseWriter, r *http.Request) {
	date, ok := s.parseDay(w, r)
	if !ok {
		return
	}
	s.renderDay(w, r, date, dayOptions{})
}

// parseDay reads {date} from the path and refuses malformed or future dates.
func (s *Server) parseDay(w http.ResponseWriter, r *http.Request) (time.Time, bool) {
	date, err := time.Parse(dateLayout, r.PathValue("date"))
	if err != nil {
		http.NotFound(w, r)
		return time.Time{}, false
	}
	if date.After(s.todayFor(r)) {
		http.Error(w, "That day hasn't happened yet.", http.StatusNotFound)
		return time.Time{}, false
	}
	return date, true
}

func (s *Server) setSteps(w http.ResponseWriter, r *http.Request) {
	date, ok := s.parseDay(w, r)
	if !ok {
		return
	}
	raw := r.PostFormValue("steps")
	steps, err := parseCount(raw, 0, maxSteps)
	if err != nil {
		s.renderDay(w, r, date, dayOptions{
			Status: http.StatusUnprocessableEntity,
			Error:  "Enter a whole number from 0 to " + commas(maxSteps) + ".",
			Input:  raw,
		})
		return
	}
	before, err := s.store.Steps(r.Context(), date)
	if err == nil {
		err = s.store.SetSteps(r.Context(), date, steps)
	}
	if err != nil {
		s.fail(w, err)
		return
	}
	s.afterWrite(w, r, date, before)
}

func (s *Server) addSteps(w http.ResponseWriter, r *http.Request) {
	date, ok := s.parseDay(w, r)
	if !ok {
		return
	}
	raw := r.PostFormValue("steps")
	steps, err := parseCount(raw, 1, maxSteps)
	if err != nil {
		s.renderDay(w, r, date, dayOptions{
			Status: http.StatusUnprocessableEntity,
			Error:  "Enter a whole number from 1 to " + commas(maxSteps) + ".",
		})
		return
	}
	before, err := s.store.Steps(r.Context(), date)
	if err == nil {
		_, err = s.store.AddSteps(r.Context(), date, steps)
	}
	if err != nil {
		s.fail(w, err)
		return
	}
	s.afterWrite(w, r, date, before)
}

func (s *Server) setGoal(w http.ResponseWriter, r *http.Request) {
	date, err := time.Parse(dateLayout, r.PostFormValue("date"))
	if err != nil || date.After(s.todayFor(r)) {
		date = s.todayFor(r)
	}
	goal, err := parseCount(r.PostFormValue("goal"), 100, maxSteps)
	if err != nil {
		// Boosted forms scroll to the top, which would hide this error far below the screen.
		w.Header().Set("HX-Reswap", "innerHTML show:#goal-row:top")
		s.renderDay(w, r, date, dayOptions{
			Status:    http.StatusUnprocessableEntity,
			GoalError: "Enter a whole number from 100 to " + commas(maxSteps) + ".",
		})
		return
	}
	if err := s.store.SetGoal(r.Context(), goal); err != nil {
		s.fail(w, err)
		return
	}
	if !isHTMX(r) {
		http.Redirect(w, r, dayPath(date), http.StatusSeeOther)
		return
	}
	w.Header().Set("HX-Push-Url", "false")
	// Before is set past any goal so that moving the flag never sets off the confetti.
	s.renderDay(w, r, date, dayOptions{Animate: true, Before: maxSteps})
}

func (s *Server) setWalker(w http.ResponseWriter, r *http.Request) {
	date, err := time.Parse(dateLayout, r.PostFormValue("date"))
	if err != nil || date.After(s.todayFor(r)) {
		date = s.todayFor(r)
	}
	picked, ok := walkerByKey(r.PostFormValue("walker"))
	if !ok {
		http.Error(w, "That character doesn't exist. Pick one from the list.", http.StatusBadRequest)
		return
	}
	if err := s.store.SetWalkerID(r.Context(), picked.ID); err != nil {
		s.fail(w, err)
		return
	}
	if !isHTMX(r) {
		http.Redirect(w, r, dayPath(date), http.StatusSeeOther)
		return
	}
	w.Header().Set("HX-Push-Url", "false")
	s.renderDay(w, r, date, dayOptions{})
}

func (s *Server) confirmClear(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	days, steps, err := s.store.Totals(ctx)
	if err != nil {
		s.fail(w, err)
		return
	}
	walker, err := s.walker(ctx)
	if err != nil {
		s.fail(w, err)
		return
	}
	s.render(w, r, http.StatusOK, page{
		Name:  "clear",
		Title: "Clear all data",
		Tabs:  tabsFor("", s.todayFor(r)),
		Clear: &clearView{Days: days, Steps: steps, Walker: walker},
	})
}

func (s *Server) clearAll(w http.ResponseWriter, r *http.Request) {
	if err := s.store.ClearAll(r.Context()); err != nil {
		s.fail(w, err)
		return
	}
	if !isHTMX(r) {
		http.Redirect(w, r, "/", http.StatusSeeOther)
		return
	}
	// Replacing the URL keeps the back button from returning to the confirmation.
	// dataCleared tells app.js to empty the offline copies of the old screens.
	w.Header().Set("HX-Replace-Url", "/")
	w.Header().Set("HX-Trigger", "dataCleared")
	s.renderDay(w, r, s.todayFor(r), dayOptions{})
}

// afterWrite sends the updated day back, so the walker can move from the old spot to the new one.
func (s *Server) afterWrite(w http.ResponseWriter, r *http.Request, date time.Time, before int) {
	if !isHTMX(r) {
		http.Redirect(w, r, dayPath(date), http.StatusSeeOther)
		return
	}
	w.Header().Set("HX-Push-Url", "false")
	s.renderDay(w, r, date, dayOptions{Animate: true, Before: before})
}

func (s *Server) renderDay(w http.ResponseWriter, r *http.Request, date time.Time, opts dayOptions) {
	ctx := r.Context()
	if opts.Status != 0 {
		// A rejected form must leave the address alone, as its URL only accepts POST.
		w.Header().Set("HX-Push-Url", "false")
	}
	steps, err := s.store.Steps(ctx, date)
	if err != nil {
		s.fail(w, err)
		return
	}
	goal, err := s.store.Goal(ctx)
	if err != nil {
		s.fail(w, err)
		return
	}
	walker, err := s.walker(ctx)
	if err != nil {
		s.fail(w, err)
		return
	}
	today := s.todayFor(r)
	view := buildDay(date, today, steps, goal, walker, opts)
	s.render(w, r, opts.Status, page{
		Name:  "day",
		Title: view.Title,
		Tabs:  tabsFor("day", date),
		Day:   view,
	})
}

func (s *Server) month(w http.ResponseWriter, r *http.Request) {
	first, err := time.Parse("2006-01", r.PathValue("ym"))
	if err != nil {
		http.NotFound(w, r)
		return
	}
	ctx := r.Context()
	days, err := s.store.MonthSteps(ctx, first.Year(), first.Month())
	if err != nil {
		s.fail(w, err)
		return
	}
	goal, err := s.store.Goal(ctx)
	if err != nil {
		s.fail(w, err)
		return
	}
	walker, err := s.walker(ctx)
	if err != nil {
		s.fail(w, err)
		return
	}
	view := buildMonth(first, s.todayFor(r), days, goal, walker)
	s.render(w, r, http.StatusOK, page{Name: "period", Title: view.Title, Tabs: tabsFor("month", first), Period: view})
}

func (s *Server) year(w http.ResponseWriter, r *http.Request) {
	first, err := time.Parse("2006", r.PathValue("year"))
	if err != nil {
		http.NotFound(w, r)
		return
	}
	months, err := s.store.YearSteps(r.Context(), first.Year())
	if err != nil {
		s.fail(w, err)
		return
	}
	walker, err := s.walker(r.Context())
	if err != nil {
		s.fail(w, err)
		return
	}
	view := buildYear(first, s.todayFor(r), months, walker)
	s.render(w, r, http.StatusOK, page{Name: "period", Title: view.Title, Tabs: tabsFor("year", first), Period: view})
}

func (s *Server) walker(ctx context.Context) (walker, error) {
	id, err := s.store.WalkerID(ctx)
	return walkerByID(id), err
}

func (s *Server) render(w http.ResponseWriter, r *http.Request, status int, p page) {
	name := "layout"
	if isHTMX(r) {
		name = "view"
	}
	h := w.Header()
	h.Set("Content-Type", "text/html; charset=utf-8")
	h.Set("Cache-Control", "no-store")
	h.Set("Vary", "HX-Request, HX-History-Restore-Request")
	if status != 0 {
		w.WriteHeader(status)
	}
	if err := s.tmpl.ExecuteTemplate(w, name, p); err != nil {
		log.Printf("render %s: %v", p.Name, err)
	}
}

func (s *Server) fail(w http.ResponseWriter, err error) {
	log.Printf("request failed: %v", err)
	http.Error(w, "Something went wrong saving or loading your steps. Try again.", http.StatusInternalServerError)
}

// isHTMX is false for history restores, because those replace the whole page.
func isHTMX(r *http.Request) bool {
	return r.Header.Get("HX-Request") == "true" && r.Header.Get("HX-History-Restore-Request") != "true"
}

func parseCount(raw string, min, max int) (int, error) {
	n, err := strconv.Atoi(strings.ReplaceAll(strings.TrimSpace(raw), ",", ""))
	if err != nil {
		return 0, err
	}
	if n < min || n > max {
		return 0, fmt.Errorf("%d is outside %d to %d", n, min, max)
	}
	return n, nil
}
