package main

import (
	"bytes"
	"html/template"
	"net/http"
	"net/http/httptest"
	"net/url"
	"os"
	"path/filepath"
	"slices"
	"strings"
	"testing"
	"time"
)

func newTestServer(t *testing.T) (http.Handler, *Store) {
	t.Helper()
	store, err := OpenStore(filepath.Join(t.TempDir(), "test.db"))
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { store.Close() })
	handler, err := NewServer(store)
	if err != nil {
		t.Fatal(err)
	}
	return handler, store
}

func do(h http.Handler, method, path string, form url.Values, headers map[string]string) *httptest.ResponseRecorder {
	req := httptest.NewRequest(method, path, strings.NewReader(form.Encode()))
	if form != nil {
		req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	}
	for k, v := range headers {
		req.Header.Set(k, v)
	}
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	return rec
}

var htmxHeaders = map[string]string{"HX-Request": "true"}

func TestSaveAndAddSteps(t *testing.T) {
	h, store := newTestServer(t)
	path := "/day/2024-03-10"

	rec := do(h, "POST", path+"/steps", url.Values{"steps": {"4,000"}}, htmxHeaders)
	if rec.Code != 200 {
		t.Fatalf("save: status %d: %s", rec.Code, rec.Body)
	}
	if got := rec.Header().Get("HX-Push-Url"); got != "false" {
		t.Errorf("save pushed URL %q, want false", got)
	}
	if !strings.Contains(rec.Body.String(), "4,000 to the flag") {
		t.Errorf("save response missing distance to flag:\n%s", rec.Body)
	}

	rec = do(h, "POST", path+"/add", url.Values{"steps": {"4000"}}, htmxHeaders)
	body := rec.Body.String()
	if !strings.Contains(body, "Pip reached the flag.") || !strings.Contains(body, `class="confetti"`) {
		t.Errorf("crossing the goal should celebrate:\n%s", body)
	}

	rec = do(h, "POST", path+"/add", url.Values{"steps": {"500"}}, htmxHeaders)
	if strings.Contains(rec.Body.String(), `class="confetti"`) {
		t.Error("confetti should only fire when the goal is first crossed")
	}

	date, _ := time.Parse(dateLayout, "2024-03-10")
	if got, _ := store.Steps(t.Context(), date); got != 8500 {
		t.Errorf("stored %d steps, want 8500", got)
	}
}

func TestAddStepsCapsTotal(t *testing.T) {
	h, store := newTestServer(t)
	do(h, "POST", "/day/2024-03-10/steps", url.Values{"steps": {"199999"}}, nil)
	do(h, "POST", "/day/2024-03-10/add", url.Values{"steps": {"500"}}, nil)
	date, _ := time.Parse(dateLayout, "2024-03-10")
	if got, _ := store.Steps(t.Context(), date); got != maxSteps {
		t.Errorf("got %d, want cap %d", got, maxSteps)
	}
}

func TestInvalidStepsKeepInputAndExplain(t *testing.T) {
	h, store := newTestServer(t)
	for _, bad := range []string{"", "abc", "-5", "1.5", "200001"} {
		rec := do(h, "POST", "/day/2024-03-10/steps", url.Values{"steps": {bad}}, htmxHeaders)
		if rec.Code != http.StatusUnprocessableEntity {
			t.Errorf("%q: status %d, want 422", bad, rec.Code)
		}
		if !strings.Contains(rec.Body.String(), "Enter a whole number") {
			t.Errorf("%q: missing error message", bad)
		}
	}
	date, _ := time.Parse(dateLayout, "2024-03-10")
	if got, _ := store.Steps(t.Context(), date); got != 0 {
		t.Errorf("invalid input stored %d steps", got)
	}
}

func TestSetGoal(t *testing.T) {
	h, store := newTestServer(t)
	do(h, "POST", "/day/2024-03-10/steps", url.Values{"steps": {"9000"}}, nil)

	for _, bad := range []string{"", "abc", "50", "200001"} {
		rec := do(h, "POST", "/goal", url.Values{"goal": {bad}, "date": {"2024-03-10"}}, htmxHeaders)
		if rec.Code != http.StatusUnprocessableEntity {
			t.Errorf("%q: status %d, want 422", bad, rec.Code)
		}
	}
	if got, _ := store.Goal(t.Context()); got != defaultGoal {
		t.Errorf("invalid goals changed the goal to %d", got)
	}
	rec := do(h, "POST", "/goal", url.Values{"goal": {"abc"}, "date": {"2024-03-10"}}, htmxHeaders)
	if got := rec.Header().Get("HX-Reswap"); !strings.Contains(got, "#goal-row") {
		t.Errorf("a goal error should stay on the goal row, got HX-Reswap %q", got)
	}

	rec = do(h, "POST", "/goal", url.Values{"goal": {"5,000"}, "date": {"2024-03-10"}}, htmxHeaders)
	if got, _ := store.Goal(t.Context()); got != 5000 {
		t.Errorf("goal = %d, want 5000", got)
	}
	body := rec.Body.String()
	if !strings.Contains(body, "Pip reached the flag.") || strings.Contains(body, `class="confetti"`) {
		t.Errorf("moving the flag should update the day without confetti:\n%s", body)
	}

	// Saving steps must leave the goal alone.
	do(h, "POST", "/day/2024-03-10/steps", url.Values{"steps": {"10000"}}, htmxHeaders)
	do(h, "POST", "/day/2024-03-10/add", url.Values{"steps": {"2500"}}, htmxHeaders)
	if got, _ := store.Goal(t.Context()); got != 5000 {
		t.Errorf("saving steps changed the goal to %d", got)
	}
}

func TestPickWalker(t *testing.T) {
	h, store := newTestServer(t)
	do(h, "POST", "/day/2024-03-10/steps", url.Values{"steps": {"9000"}}, nil)

	if body := do(h, "GET", "/day/2024-03-10", nil, nil).Body.String(); !strings.Contains(body, "Pip reached the flag.") {
		t.Error("Pip should walk until another character is picked")
	}

	rec := do(h, "POST", "/walker", url.Values{"walker": {"miso"}, "date": {"2024-03-10"}}, htmxHeaders)
	if rec.Code != 200 {
		t.Fatalf("pick: status %d: %s", rec.Code, rec.Body)
	}
	if got := rec.Header().Get("HX-Push-Url"); got != "false" {
		t.Errorf("pick pushed URL %q, want false", got)
	}
	body := rec.Body.String()
	if !strings.Contains(body, "Miso reached the flag.") || !strings.Contains(body, "Miso is 100.0%") {
		t.Errorf("response should use the picked name:\n%s", body)
	}
	if strings.Contains(body, `class="confetti"`) {
		t.Error("picking a character should not set off the confetti")
	}

	// The choice sticks, and reaches the screens that draw the walker.
	miso := `#F4792B`
	for _, path := range []string{"/day/2024-03-10", "/month/2024-03", "/year/2024", "/month/2020-06"} {
		if !strings.Contains(do(h, "GET", path, nil, nil).Body.String(), miso) {
			t.Errorf("%s should draw Miso", path)
		}
	}

	rec = do(h, "POST", "/walker", url.Values{"walker": {"dragon"}}, htmxHeaders)
	if rec.Code != http.StatusBadRequest {
		t.Errorf("unknown walker: status %d, want 400", rec.Code)
	}
	if id, _ := store.WalkerID(t.Context()); id != 2 {
		t.Errorf("unknown walker changed the saved choice to %d", id)
	}

	// An ID left behind by a removed character must not break the app.
	store.SetWalkerID(t.Context(), 99)
	if rec := do(h, "GET", "/day/2024-03-10", nil, nil); rec.Code != 200 || !strings.Contains(rec.Body.String(), "Pip reached the flag.") {
		t.Errorf("unknown saved ID should fall back to Pip, got status %d", rec.Code)
	}
}

func TestClearAll(t *testing.T) {
	dbPath := filepath.Join(t.TempDir(), "test.db")
	store, err := OpenStore(dbPath)
	if err != nil {
		t.Fatal(err)
	}
	defer store.Close()
	h, err := NewServer(store)
	if err != nil {
		t.Fatal(err)
	}

	form := func(k, v string) url.Values { return url.Values{k: {v}, "date": {"2024-03-10"}} }
	do(h, "POST", "/day/2024-03-10/steps", url.Values{"steps": {"9000"}}, nil)
	do(h, "POST", "/day/2024-03-11/steps", url.Values{"steps": {"1000"}}, nil)
	do(h, "POST", "/day/2024-03-12/steps", url.Values{"steps": {"0"}}, nil)
	do(h, "POST", "/goal", form("goal", "5000"), nil)
	do(h, "POST", "/walker", form("walker", "nori"), nil)

	// Opening the confirmation says what will go, and deletes nothing.
	body := do(h, "GET", "/clear", nil, nil).Body.String()
	if !strings.Contains(body, "2 days of steps") || !strings.Contains(body, "10,000 steps in total") {
		t.Errorf("confirmation should describe the data:\n%s", body)
	}
	if days, _, _ := store.Totals(t.Context()); days != 2 {
		t.Errorf("opening the confirmation changed the data: %d days", days)
	}

	// Another site can't trigger it.
	rec := do(h, "POST", "/clear", url.Values{}, map[string]string{"Sec-Fetch-Site": "cross-site"})
	if rec.Code != http.StatusForbidden {
		t.Errorf("cross-site clear: status %d, want 403", rec.Code)
	}
	if days, _, _ := store.Totals(t.Context()); days != 2 {
		t.Errorf("cross-site clear changed the data: %d days", days)
	}

	rec = do(h, "POST", "/clear", url.Values{}, htmxHeaders)
	if rec.Code != 200 {
		t.Fatalf("clear: status %d: %s", rec.Code, rec.Body)
	}
	if got := rec.Header().Get("HX-Trigger"); got != "dataCleared" {
		t.Errorf("HX-Trigger = %q, want dataCleared", got)
	}
	if got := rec.Header().Get("HX-Replace-Url"); got != "/" {
		t.Errorf("HX-Replace-Url = %q, want /", got)
	}
	if !strings.Contains(rec.Body.String(), "Pip is still asleep") {
		t.Errorf("clear should show an empty today with the default character:\n%s", rec.Body)
	}

	if days, steps, _ := store.Totals(t.Context()); days != 0 || steps != 0 {
		t.Errorf("after clear: %d days, %d steps", days, steps)
	}
	var rows int
	store.db.QueryRow(`SELECT COUNT(*) FROM steps`).Scan(&rows)
	if rows != 0 {
		t.Errorf("after clear: %d rows left, including zero-step days", rows)
	}
	if got, _ := store.Goal(t.Context()); got != defaultGoal {
		t.Errorf("goal = %d, want default %d", got, defaultGoal)
	}
	if id, _ := store.WalkerID(t.Context()); id != 0 {
		t.Errorf("walker = %d, want none", id)
	}

	// The old rows must not survive in the database files either.
	for _, name := range []string{dbPath, dbPath + "-wal"} {
		raw, err := os.ReadFile(name)
		if err != nil && !os.IsNotExist(err) {
			t.Fatal(err)
		}
		if bytes.Contains(raw, []byte("2024-03-1")) {
			t.Errorf("%s still contains deleted dates", filepath.Base(name))
		}
	}

	// The app keeps working afterwards.
	do(h, "POST", "/day/2024-03-10/steps", url.Values{"steps": {"42"}}, nil)
	if days, steps, _ := store.Totals(t.Context()); days != 1 || steps != 42 {
		t.Errorf("after logging again: %d days, %d steps", days, steps)
	}
}

func TestRejectedFormsKeepTheAddress(t *testing.T) {
	h, _ := newTestServer(t)
	for _, c := range []struct {
		path string
		form url.Values
	}{
		{"/day/2024-03-10/steps", url.Values{"steps": {"abc"}}},
		{"/day/2024-03-10/add", url.Values{"steps": {"abc"}}},
		{"/goal", url.Values{"goal": {"abc"}, "date": {"2024-03-10"}}},
	} {
		rec := do(h, "POST", c.path, c.form, htmxHeaders)
		if rec.Code != http.StatusUnprocessableEntity {
			t.Errorf("%s: status %d, want 422", c.path, rec.Code)
		}
		if got := rec.Header().Get("HX-Push-Url"); got != "false" {
			t.Errorf("%s: HX-Push-Url = %q, want false", c.path, got)
		}
	}
}

func TestThemeToggleIsOnEveryScreen(t *testing.T) {
	h, _ := newTestServer(t)
	toggle := `id="theme-toggle"`
	for _, path := range []string{"/", "/day/2024-03-10", "/month/2024-03", "/year/2024", "/clear"} {
		if got := strings.Count(do(h, "GET", path, nil, nil).Body.String(), toggle); got != 1 {
			t.Errorf("%s: page has %d toggles, want 1", path, got)
		}
		// It sits outside #view, so swapping screens must not add another.
		if strings.Contains(do(h, "GET", path, nil, htmxHeaders).Body.String(), toggle) {
			t.Errorf("%s: fragment should not include the toggle", path)
		}
	}
}

func TestCalendar(t *testing.T) {
	first := time.Date(2024, 2, 1, 0, 0, 0, 0, time.UTC) // a leap February starting on a Thursday
	today := time.Date(2024, 2, 20, 0, 0, 0, 0, time.UTC)
	days := map[int]int{1: 9000, 2: 3215, 3: 0, 19: 12451}

	got := buildMonth(first, today, days, 8000, walkers[0]).Calendar
	if len(got) != 29 {
		t.Fatalf("got %d days, want 29", len(got))
	}
	if got[0].Start != 4 {
		t.Errorf("the 1st starts in column %d, want 4 for Thursday", got[0].Start)
	}
	for i := 1; i < len(got); i++ {
		if got[i].Start != 0 {
			t.Errorf("day %d has its own start column", got[i].Day)
		}
	}

	checks := []struct {
		day            int
		steps, label   string
		reached, today bool
		future         bool
	}{
		{1, "9,000", "Thu 1 Feb: 9,000 steps, goal reached", true, false, false},
		{2, "3,215", "Fri 2 Feb: 3,215 steps", false, false, false},
		{3, "", "Sat 3 Feb: no steps logged", false, false, false},
		{4, "", "Sun 4 Feb: no steps logged", false, false, false},
		{19, "12.5K", "Mon 19 Feb: 12,451 steps, goal reached", true, false, false},
		{20, "", "Tue 20 Feb: no steps logged", false, true, false},
		{21, "", "Wed 21 Feb", false, false, true},
		{29, "", "Thu 29 Feb", false, false, true},
	}
	for _, c := range checks {
		d := got[c.day-1]
		if d.Day != c.day || d.Steps != c.steps || d.Label != c.label || d.Reached != c.reached || d.Today != c.today || d.Future != c.future {
			t.Errorf("day %d = %+v, want %+v", c.day, d, c)
		}
	}

	// Months that start on the edges of the week.
	for date, want := range map[time.Time]int{
		time.Date(2024, 1, 1, 0, 0, 0, 0, time.UTC): 1, // Monday
		time.Date(2024, 9, 1, 0, 0, 0, 0, time.UTC): 7, // Sunday
		time.Date(2024, 6, 1, 0, 0, 0, 0, time.UTC): 6, // Saturday
	} {
		if got := buildMonth(date, today, nil, 8000, walkers[0]).Calendar[0].Start; got != want {
			t.Errorf("%s starts in column %d, want %d", date.Format("Jan 2006"), got, want)
		}
	}

	if buildYear(first, today, nil, walkers[0]).Calendar != nil {
		t.Error("the year view shouldn't have a calendar")
	}
}

func TestCalendarOnThePage(t *testing.T) {
	h, _ := newTestServer(t)
	do(h, "POST", "/day/2024-02-05/steps", url.Values{"steps": {"9000"}}, nil)
	body := do(h, "GET", "/month/2024-02", nil, nil).Body.String()
	for _, want := range []string{"Your calendar", `grid-column-start:4`, `aria-label="Mon 5 Feb: 9,000 steps, goal reached"`, `aria-label="Tue 6 Feb: no steps logged"`} {
		if !strings.Contains(body, want) {
			t.Errorf("month page missing %q", want)
		}
	}
	if strings.Contains(body, "ZgotmplZ") {
		t.Error("template escaper rejected a value")
	}

	// An empty month still offers its days, so you can fill them in.
	empty := do(h, "GET", "/month/2020-06", nil, nil).Body.String()
	if !strings.Contains(empty, "No steps logged in") || !strings.Contains(empty, `href="/day/2020-06-15"`) {
		t.Error("an empty month should show its calendar")
	}
	if strings.Contains(do(h, "GET", "/year/2024", nil, nil).Body.String(), "Your calendar") {
		t.Error("the year page shouldn't have a calendar")
	}
}

func TestShortSteps(t *testing.T) {
	for n, want := range map[int]string{
		1: "1", 999: "999", 8391: "8,391", 9999: "9,999", 10000: "10K", 12451: "12.5K",
		12000: "12K", 99949: "99.9K", 99950: "100K", 100000: "100K", 199600: "200K", 200000: "200K",
	} {
		if got := shortSteps(n); got != want {
			t.Errorf("shortSteps(%d) = %q, want %q", n, got, want)
		}
	}
}

func TestFutureDaysAreRefused(t *testing.T) {
	h, store := newTestServer(t)
	future := time.Now().AddDate(0, 0, 3).Format(dateLayout)
	if rec := do(h, "GET", "/day/"+future, nil, nil); rec.Code != 404 {
		t.Errorf("GET future: status %d", rec.Code)
	}
	if rec := do(h, "POST", "/day/"+future+"/steps", url.Values{"steps": {"10"}}, nil); rec.Code != 404 {
		t.Errorf("POST future: status %d", rec.Code)
	}
	date, _ := time.Parse(dateLayout, future)
	if got, _ := store.Steps(t.Context(), date); got != 0 {
		t.Errorf("future day stored %d steps", got)
	}
}

func TestFragmentsAndFullPages(t *testing.T) {
	h, _ := newTestServer(t)
	for _, path := range []string{"/", "/day/2024-03-10", "/month/2024-03", "/year/2024"} {
		full := do(h, "GET", path, nil, nil).Body.String()
		if !strings.Contains(full, "<!DOCTYPE html>") {
			t.Errorf("%s: full request should get the whole page", path)
		}
		fragment := do(h, "GET", path, nil, htmxHeaders).Body.String()
		if strings.Contains(fragment, "<!DOCTYPE html>") {
			t.Errorf("%s: htmx request should get a fragment", path)
		}
		restore := do(h, "GET", path, nil, map[string]string{"HX-Request": "true", "HX-History-Restore-Request": "true"}).Body.String()
		if !strings.Contains(restore, "<!DOCTYPE html>") {
			t.Errorf("%s: history restore should get the whole page", path)
		}
		if strings.Contains(full, "ZgotmplZ") {
			t.Errorf("%s: template escaper rejected a value", path)
		}
	}
}

func TestMonthAndYearTotals(t *testing.T) {
	h, _ := newTestServer(t)
	for date, steps := range map[string]string{
		"2024-02-29": "10000", // leap day, the last bar of the month
		"2024-02-01": "2000",
		"2024-03-15": "5000",
		"2023-02-10": "9999", // another year, must stay out
	} {
		do(h, "POST", "/day/"+date+"/steps", url.Values{"steps": {steps}}, nil)
	}

	month := do(h, "GET", "/month/2024-02", nil, nil).Body.String()
	for _, want := range []string{"12,000", "Thu 29 Feb", "reached your goal on 1 of the 2 days", "Best day: Thu 29 Feb"} {
		if !strings.Contains(month, want) {
			t.Errorf("month page missing %q", want)
		}
	}
	if strings.Count(month, `aria-label="Thu 29 Feb: 10,000 steps"`) != 1 {
		t.Error("February 2024 should have a bar for the 29th")
	}

	year := do(h, "GET", "/year/2024", nil, nil).Body.String()
	for _, want := range []string{"17,000", "Best month: February, with 12,000 steps", "5,666 steps a day, across the 3 days"} {
		if !strings.Contains(year, want) {
			t.Errorf("year page missing %q", want)
		}
	}
}

func TestEmptyPeriodsInviteLogging(t *testing.T) {
	h, _ := newTestServer(t)
	for _, path := range []string{"/month/2020-06", "/year/2020"} {
		body := do(h, "GET", path, nil, nil).Body.String()
		if !strings.Contains(body, "No steps logged in") || !strings.Contains(body, "Log today's steps") {
			t.Errorf("%s: missing empty state", path)
		}
	}
}

func TestCrossOriginPostsAreBlocked(t *testing.T) {
	h, _ := newTestServer(t)
	rec := do(h, "POST", "/day/2024-03-10/steps", url.Values{"steps": {"1"}},
		map[string]string{"Sec-Fetch-Site": "cross-site"})
	if rec.Code != http.StatusForbidden {
		t.Errorf("status %d, want 403", rec.Code)
	}
}

func TestTodayFollowsVisitorTimeZone(t *testing.T) {
	store, err := OpenStore(filepath.Join(t.TempDir(), "test.db"))
	if err != nil {
		t.Fatal(err)
	}
	defer store.Close()
	s := &Server{store: store, now: func() time.Time {
		return time.Date(2024, 1, 1, 23, 30, 0, 0, time.UTC)
	}}
	req := httptest.NewRequest("GET", "/", nil)
	req.AddCookie(&http.Cookie{Name: "tz", Value: url.QueryEscape("Asia/Phnom_Penh")})
	if got := s.todayFor(req).Format(dateLayout); got != "2024-01-02" {
		t.Errorf("got %s, want next day in Phnom Penh", got)
	}
	req = httptest.NewRequest("GET", "/", nil)
	req.AddCookie(&http.Cookie{Name: "tz", Value: "../../etc/passwd"})
	s.todayFor(req) // must fall back quietly rather than panic
}

func TestCalendarMonthArrows(t *testing.T) {
	h, _ := newTestServer(t)
	calendarOf := func(path string) string {
		t.Helper()
		_, after, ok := strings.Cut(do(h, "GET", path, nil, nil).Body.String(), `id="calendar-heading"`)
		if !ok {
			t.Fatalf("%s has no calendar", path)
		}
		return after
	}

	past := calendarOf("/month/2024-02")
	for _, want := range []string{`href="/month/2024-01"`, `href="/month/2024-03"`, "Feb 2024", "show:#calendar-heading:top"} {
		if !strings.Contains(past, want) {
			t.Errorf("past month's calendar is missing %q", want)
		}
	}

	// Going further back works even through months with nothing logged.
	if empty := calendarOf("/month/2020-06"); !strings.Contains(empty, `href="/month/2020-05"`) {
		t.Error("an empty month's calendar should still link to the month before")
	}

	now := time.Now()
	current := calendarOf("/month/" + now.Format("2006-01"))
	if strings.Contains(current, `aria-label="Next month"`) {
		t.Error("the current month's calendar shouldn't offer a next month")
	}
	if !strings.Contains(current, `aria-label="Previous month"`) {
		t.Error("the current month's calendar should offer the previous month")
	}
}

func TestCompare(t *testing.T) {
	cases := []struct {
		steps int
		want  string
	}{
		{50, ""},
		{100, "one Olympic pool"},
		{200, "one football pitch"},
		{500, "one Eiffel Tower"},
		{2000, "the height of the Burj Khalifa"},
		{5000, "the length of the Golden Gate Bridge"},
		{8000, "the length of the Golden Gate Bridge 2 times"},
		{12000, "the height of Everest"},
		{50000, "the height of Everest 4 times"},
		{60000 * 2, "2 marathons"},
		{600000, "the length of the Grand Canyon"},
		{2400000, "the length of the Grand Canyon 4 times"},
		{6000000, "the length of Route 66"},
	}
	for _, c := range cases {
		got := ""
		if cmp := compare(c.steps); cmp != nil {
			got = cmp.Text
		}
		if got != c.want {
			t.Errorf("compare(%d) = %q, want %q", c.steps, got, c.want)
		}
	}
}

func TestDayShowsMoreFacts(t *testing.T) {
	cases := []struct {
		steps int
		want  []string
	}{
		{50, nil},
		{100, nil}, // only the pool fits, and that one is already beside the picture
		{500, []string{"3 football pitches end to end", "7 Olympic pools end to end"}},
		{2933, []string{"6 Eiffel Towers end to end", "20 football pitches end to end"}},
	}
	day := time.Date(2024, 1, 1, 0, 0, 0, 0, time.UTC)
	for _, c := range cases {
		var got []string
		for _, f := range buildDay(day, day, c.steps, 8000, walkers[0], dayOptions{}).MoreFacts {
			got = append(got, f.Text)
		}
		if !slices.Equal(got, c.want) {
			t.Errorf("%d steps: more facts = %q, want %q", c.steps, got, c.want)
		}
	}
}

// Every landmark needs a drawing, or the picture beside its fact comes out blank.
func TestEveryLandmarkHasArt(t *testing.T) {
	tmpl, err := template.New("").Funcs(template.FuncMap{"commas": commas, "plural": plural, "pose": newPose}).ParseFS(content, "templates/*.html")
	if err != nil {
		t.Fatal(err)
	}
	for _, l := range landmarks {
		var b strings.Builder
		if err := tmpl.ExecuteTemplate(&b, "landmark", l.art); err != nil {
			t.Fatal(err)
		}
		if !strings.Contains(b.String(), "<") {
			t.Errorf("landmark %q has no drawing in art.html", l.art)
		}
	}
}

func TestNiceCeilAndCommas(t *testing.T) {
	for n, want := range map[int]int{0: 1000, 7: 8, 800: 800, 8000: 8000, 8001: 10000, 14210: 15000, 240000: 250000, 1000: 1000} {
		if got := niceCeil(n); got != want {
			t.Errorf("niceCeil(%d) = %d, want %d", n, got, want)
		}
	}
	for n, want := range map[int]string{0: "0", 999: "999", 1000: "1,000", 1234567: "1,234,567"} {
		if got := commas(n); got != want {
			t.Errorf("commas(%d) = %q, want %q", n, got, want)
		}
	}
}
