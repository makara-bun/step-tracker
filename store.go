package main

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"time"

	_ "modernc.org/sqlite"
)

const (
	maxSteps    = 200_000
	defaultGoal = 8_000
	dateLayout  = "2006-01-02"
)

// Store keeps one row per calendar day. Dates are plain YYYY-MM-DD strings so
// that a day stays the same day whatever time zone the user is in.
type Store struct {
	db *sql.DB
}

func OpenStore(path string) (*Store, error) {
	db, err := sql.Open("sqlite", "file:"+path+"?_pragma=journal_mode(WAL)&_pragma=busy_timeout(5000)")
	if err != nil {
		return nil, err
	}
	db.SetMaxOpenConns(1)
	_, err = db.Exec(`
		CREATE TABLE IF NOT EXISTS steps (
			day   TEXT PRIMARY KEY,
			steps INTEGER NOT NULL CHECK (steps >= 0)
		);
		CREATE TABLE IF NOT EXISTS settings (
			key   TEXT PRIMARY KEY,
			value INTEGER NOT NULL
		);`)
	if err != nil {
		db.Close()
		return nil, fmt.Errorf("create schema: %w", err)
	}
	return &Store{db: db}, nil
}

func (s *Store) Close() error { return s.db.Close() }

func (s *Store) Steps(ctx context.Context, day time.Time) (int, error) {
	var steps int
	err := s.db.QueryRowContext(ctx, `SELECT steps FROM steps WHERE day = ?`, day.Format(dateLayout)).Scan(&steps)
	if errors.Is(err, sql.ErrNoRows) {
		return 0, nil
	}
	return steps, err
}

func (s *Store) SetSteps(ctx context.Context, day time.Time, steps int) error {
	_, err := s.db.ExecContext(ctx, `
		INSERT INTO steps (day, steps) VALUES (?, ?)
		ON CONFLICT (day) DO UPDATE SET steps = excluded.steps`,
		day.Format(dateLayout), steps)
	return err
}

// AddSteps adds to the day's total, capped at maxSteps, and returns the new total.
func (s *Store) AddSteps(ctx context.Context, day time.Time, steps int) (int, error) {
	var total int
	err := s.db.QueryRowContext(ctx, `
		INSERT INTO steps (day, steps) VALUES (?1, MIN(?2, ?3))
		ON CONFLICT (day) DO UPDATE SET steps = MIN(steps + ?2, ?3)
		RETURNING steps`,
		day.Format(dateLayout), steps, maxSteps).Scan(&total)
	return total, err
}

// MonthSteps returns the logged steps in a month, keyed by day of the month.
func (s *Store) MonthSteps(ctx context.Context, year int, month time.Month) (map[int]int, error) {
	rows, err := s.db.QueryContext(ctx,
		`SELECT CAST(substr(day, 9, 2) AS INTEGER), steps FROM steps WHERE substr(day, 1, 7) = ?`,
		fmt.Sprintf("%04d-%02d", year, int(month)))
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := map[int]int{}
	for rows.Next() {
		var day, steps int
		if err := rows.Scan(&day, &steps); err != nil {
			return nil, err
		}
		out[day] = steps
	}
	return out, rows.Err()
}

// MonthTotal is one month's sum and how many days in it have steps logged.
type MonthTotal struct {
	Steps      int
	ActiveDays int
}

// YearSteps returns per-month totals for a year, keyed by month.
func (s *Store) YearSteps(ctx context.Context, year int) (map[time.Month]MonthTotal, error) {
	rows, err := s.db.QueryContext(ctx, `
		SELECT CAST(substr(day, 6, 2) AS INTEGER), SUM(steps), SUM(steps > 0)
		FROM steps WHERE substr(day, 1, 4) = ? GROUP BY 1`,
		fmt.Sprintf("%04d", year))
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := map[time.Month]MonthTotal{}
	for rows.Next() {
		var month int
		var total MonthTotal
		if err := rows.Scan(&month, &total.Steps, &total.ActiveDays); err != nil {
			return nil, err
		}
		out[time.Month(month)] = total
	}
	return out, rows.Err()
}

// Totals counts the days with steps logged and all the steps on them.
func (s *Store) Totals(ctx context.Context) (days, steps int, err error) {
	err = s.db.QueryRowContext(ctx,
		`SELECT COUNT(*), COALESCE(SUM(steps), 0) FROM steps WHERE steps > 0`).Scan(&days, &steps)
	return days, steps, err
}

// ClearAll deletes all steps and settings. SQLite only marks deleted rows as free
// space, so it also rewrites the files to make sure the old data is really gone.
func (s *Store) ClearAll(ctx context.Context) error {
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()
	if _, err := tx.ExecContext(ctx, `DELETE FROM steps`); err != nil {
		return err
	}
	if _, err := tx.ExecContext(ctx, `DELETE FROM settings`); err != nil {
		return err
	}
	if err := tx.Commit(); err != nil {
		return err
	}
	if _, err := s.db.ExecContext(ctx, `VACUUM`); err != nil {
		return fmt.Errorf("vacuum: %w", err)
	}
	if _, err := s.db.ExecContext(ctx, `PRAGMA wal_checkpoint(TRUNCATE)`); err != nil {
		return fmt.Errorf("checkpoint: %w", err)
	}
	return nil
}

func (s *Store) Goal(ctx context.Context) (int, error) {
	return s.setting(ctx, "goal", defaultGoal)
}

func (s *Store) SetGoal(ctx context.Context, goal int) error {
	return s.setSetting(ctx, "goal", goal)
}

// WalkerID returns the ID of the chosen character, or 0 if none has been picked.
func (s *Store) WalkerID(ctx context.Context) (int, error) {
	return s.setting(ctx, "walker", 0)
}

func (s *Store) SetWalkerID(ctx context.Context, id int) error {
	return s.setSetting(ctx, "walker", id)
}

func (s *Store) setting(ctx context.Context, key string, fallback int) (int, error) {
	var value int
	err := s.db.QueryRowContext(ctx, `SELECT value FROM settings WHERE key = ?`, key).Scan(&value)
	if errors.Is(err, sql.ErrNoRows) {
		return fallback, nil
	}
	return value, err
}

func (s *Store) setSetting(ctx context.Context, key string, value int) error {
	_, err := s.db.ExecContext(ctx, `
		INSERT INTO settings (key, value) VALUES (?, ?)
		ON CONFLICT (key) DO UPDATE SET value = excluded.value`, key, value)
	return err
}
