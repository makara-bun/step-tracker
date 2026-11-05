package main

import (
	"fmt"
	"math"
	"strconv"
	"strings"
	"time"
)

// metersPerStep is an average adult stride. It turns steps into the "about N km" estimates.
const metersPerStep = 0.75

// walker is a character the user can pick to walk the hill. ID is what gets saved,
// so keep it stable. To add one, list it here and draw it in templates/art.html.
type walker struct {
	ID        int
	Key, Name string
}

var walkers = []walker{
	{ID: 1, Key: "pip", Name: "Pip"},
	{ID: 2, Key: "miso", Name: "Miso"},
	{ID: 3, Key: "nori", Name: "Nori"},
}

// walkerByID falls back to the first walker, which is also the default before any choice.
func walkerByID(id int) walker {
	for _, w := range walkers {
		if w.ID == id {
			return w
		}
	}
	return walkers[0]
}

func walkerByKey(key string) (walker, bool) {
	for _, w := range walkers {
		if w.Key == key {
			return w, true
		}
	}
	return walker{}, false
}

// pose is what the "walker" template draws: who it is, and "asleep", "walking" or "summit".
type pose struct {
	Walker, Mood string
}

func newPose(walkerKey, mood string) pose { return pose{Walker: walkerKey, Mood: mood} }

type page struct {
	Name   string // "day", "period" or "clear"
	Title  string
	Tabs   []tab
	Day    *dayView
	Period *periodView
	Clear  *clearView
}

// clearView is the confirmation screen for deleting everything.
type clearView struct {
	Days, Steps int
	Walker      walker
}

type tab struct {
	Label, Href, Icon string
	Active            bool
}

// tabsFor keeps the month and year tabs on the period being looked at.
func tabsFor(active string, date time.Time) []tab {
	return []tab{
		{Label: "Day", Href: "/", Icon: "day", Active: active == "day"},
		{Label: "Month", Href: monthPath(date), Icon: "month", Active: active == "month"},
		{Label: "Year", Href: yearPath(date), Icon: "year", Active: active == "year"},
	}
}

func dayPath(d time.Time) string   { return "/day/" + d.Format(dateLayout) }
func monthPath(d time.Time) string { return "/month/" + d.Format("2006-01") }
func yearPath(d time.Time) string  { return "/year/" + d.Format("2006") }

// dayOptions carries the outcome of a form post into the re-rendered day.
type dayOptions struct {
	Status    int
	Animate   bool
	Before    int
	Error     string
	GoalError string
	Input     string
}

type dayView struct {
	Title, Heading, Path string
	PrevHref, NextHref   string
	IsToday              bool
	Steps, Goal          int
	Pct                  string // the walker's position along the ridge, 0-100
	Mood                 string // "asleep", "walking" or "summit"
	Status               string
	Distance             string
	Compare              *comparison
	MoreFacts            []comparison
	Animate, Celebrate   bool
	Error, GoalError     string
	Input                string
	QuickAdds            []int
	Confetti             []confettiPiece
	Walker               walker
	Walkers              []walker
}

type confettiPiece struct {
	X, Y  int
	Color string
	Delay int
}

func buildDay(date, today time.Time, steps, goal int, w walker, opts dayOptions) *dayView {
	v := &dayView{
		Path:      dayPath(date),
		PrevHref:  dayPath(date.AddDate(0, 0, -1)),
		IsToday:   date.Equal(today),
		Steps:     steps,
		Goal:      goal,
		Distance:  distanceText(steps),
		Animate:   opts.Animate,
		Error:     opts.Error,
		GoalError: opts.GoalError,
		Input:     opts.Input,
		QuickAdds: []int{500, 1000, 2500},
		Walker:    w,
		Walkers:   walkers,
	}
	if v.IsToday {
		v.Title, v.Heading = "Today", "Today"
	} else {
		v.Title = date.Format("Mon 2 Jan 2006")
		v.Heading = date.Format("Mon 2 Jan")
		if date.Year() != today.Year() {
			v.Heading = date.Format("2 Jan 2006")
		}
		v.NextHref = dayPath(date.AddDate(0, 0, 1))
	}
	if v.Error == "" && steps > 0 {
		v.Input = strconv.Itoa(steps)
	}
	if found := comparisons(steps); len(found) > 0 {
		v.Compare, v.MoreFacts = &found[0], found[1:]
	}

	pct := math.Min(float64(steps)/float64(goal)*100, 100)
	v.Pct = strconv.FormatFloat(pct, 'f', 1, 64)
	switch {
	case steps == 0 && v.IsToday:
		v.Mood, v.Status = "asleep", w.Name+" is still asleep. Log your first steps."
	case steps == 0:
		v.Mood, v.Status = "asleep", "No steps logged this day."
	case steps >= goal:
		v.Mood, v.Status = "summit", w.Name+" reached the flag."
	default:
		v.Mood, v.Status = "walking", commas(goal-steps)+" to the flag"
	}
	if opts.Animate && opts.Before < goal && steps >= goal {
		v.Celebrate = true
		v.Confetti = confetti
	}
	return v
}

var confetti = []confettiPiece{
	{-46, -52, "#FF5C8A", 0}, {-30, -74, "#FDF8E8", 40}, {-12, -60, "#3F5BD9", 90},
	{4, -84, "#FF5C8A", 20}, {20, -66, "#FDF8E8", 70}, {36, -78, "#3F5BD9", 30},
	{50, -50, "#FF5C8A", 60}, {-56, -30, "#3F5BD9", 110}, {60, -28, "#FDF8E8", 100},
}

// comparison turns a distance into something you can picture: 3 marathons, 2 Everests.
type comparison struct {
	Art   string
	Count int
	Text  string
}

// landmarks run from longest to shortest. Each art name is drawn in templates/art.html.
var landmarks = []struct {
	km        float64
	art       string
	one, many string // printf patterns taking the count
}{
	{3940, "route66", "the length of Route 66", "the length of Route 66 %d times"},
	{446, "canyon", "the length of the Grand Canyon", "the length of the Grand Canyon %d times"},
	{42.195, "medal", "a full marathon", "%d marathons"},
	{8.849, "everest", "the height of Everest", "the height of Everest %d times"},
	{2.737, "bridge", "the length of the Golden Gate Bridge", "the length of the Golden Gate Bridge %d times"},
	{0.828, "burj", "the height of the Burj Khalifa", "the height of the Burj Khalifa %d times"},
	{0.33, "eiffel", "one Eiffel Tower", "%d Eiffel Towers end to end"},
	{0.105, "pitch", "one football pitch", "%d football pitches end to end"},
	{0.05, "pool", "one Olympic pool", "%d Olympic pools end to end"},
}

// maxComparisons is how many facts the Day screen shows: the picture's fact and two more.
const maxComparisons = 3

// comparisons lists the landmarks this distance covers, biggest first.
func comparisons(steps int) []comparison {
	km := kilometres(steps)
	var found []comparison
	for _, l := range landmarks {
		n := int(km / l.km)
		if n < 1 {
			continue
		}
		c := comparison{Art: l.art, Count: n, Text: l.one}
		if n > 1 {
			c.Text = fmt.Sprintf(l.many, n)
		}
		found = append(found, c)
		if len(found) == maxComparisons {
			break
		}
	}
	return found
}

// compare is the single biggest landmark, which is the one that gets a picture.
func compare(steps int) *comparison {
	if found := comparisons(steps); len(found) > 0 {
		return &found[0]
	}
	return nil
}

func kilometres(steps int) float64 { return float64(steps) * metersPerStep / 1000 }

func distanceText(steps int) string {
	km := kilometres(steps)
	if km < 100 {
		return "About " + strconv.FormatFloat(km, 'f', 1, 64) + " km"
	}
	return "About " + commas(int(math.Round(km))) + " km"
}

// periodView is the shared shape of the month and year screens.
type periodView struct {
	Kind, Title        string
	PrevHref, NextHref string
	Total              int
	Distance           string
	Compare            *comparison
	Chart              chart
	Calendar           []calendarDay
	CalendarLabel      string // the month, short enough to sit between the calendar's arrows
	Walker             walker
	Summary            []string
	EmptyText          string
	TodayHref          string
	TableLabel         string
}

// calendarDay is one cell of the month calendar.
type calendarDay struct {
	Day           int
	Steps         string // short enough to fit a cell; empty if nothing is logged
	Label, Href   string
	Reached       bool
	Today, Future bool
	Start         int // grid column, set only on the 1st so the month starts on the right weekday
}

// buildCalendar lays a month out in weeks that start on Monday.
func buildCalendar(bars []bar, first time.Time) []calendarDay {
	days := make([]calendarDay, len(bars))
	for i, b := range bars {
		d := calendarDay{Day: i + 1, Href: b.Href, Today: b.Current, Future: b.Future, Label: b.Name}
		switch {
		case b.Future:
		case b.Value == 0:
			d.Label += ": no steps logged"
		case b.MetGoal:
			d.Steps, d.Reached = shortSteps(b.Value), true
			d.Label += ": " + commas(b.Value) + " steps, goal reached"
		default:
			d.Steps = shortSteps(b.Value)
			d.Label += ": " + commas(b.Value) + " steps"
		}
		days[i] = d
	}
	days[0].Start = (int(first.Weekday())+6)%7 + 1
	return days
}

// shortSteps fits a count into a calendar cell: 8,391, 12.5K or 200K.
func shortSteps(n int) string {
	switch {
	case n < 10_000:
		return commas(n)
	case n < 99_950:
		return strings.TrimSuffix(strconv.FormatFloat(float64(n)/1000, 'f', 1, 64), ".0") + "K"
	}
	return strconv.Itoa(int(math.Round(float64(n)/1000))) + "K"
}

type chart struct {
	Walker    string // key of the walker standing on the best bar
	Bars      []bar
	Ticks     []tick
	HasGoal   bool
	GoalPct   string
	GoalLabel string
	Caption   string
}

type tick struct {
	Label, Pct string
}

type bar struct {
	Axis, AxisShort string // AxisShort replaces Axis where the labels would touch
	Name, Href      string
	Value           int
	Pct             string
	MetGoal, Best   bool
	Current, Future bool
	Align           string // tooltip alignment, so the edges don't clip
}

func buildMonth(first, today time.Time, days map[int]int, goal int, w walker) *periodView {
	v := &periodView{
		Kind:       "month",
		Walker:     w,
		Title:      first.Format("January 2006"),
		PrevHref:   monthPath(first.AddDate(0, -1, 0)),
		TableLabel: "Day",
	}
	if first.Before(firstOfMonth(today)) {
		v.NextHref = monthPath(first.AddDate(0, 1, 0))
	}

	count := first.AddDate(0, 1, -1).Day()
	values := make([]int, count)
	bestDay, logged, metGoal := -1, 0, 0
	for d := 1; d <= count; d++ {
		n := days[d]
		values[d-1] = n
		v.Total += n
		if n > 0 {
			logged++
			if bestDay < 0 || n > values[bestDay] {
				bestDay = d - 1
			}
		}
		if n >= goal {
			metGoal++
		}
	}

	axisMax := niceCeil(max(maxOf(values), goal))
	bars := make([]bar, count)
	for i, n := range values {
		date := first.AddDate(0, 0, i)
		bars[i] = bar{
			Name:    date.Format("Mon 2 Jan"),
			Href:    dayPath(date),
			Value:   n,
			Pct:     pctOf(n, axisMax),
			MetGoal: n >= goal,
			Best:    i == bestDay,
			Current: date.Equal(today),
			Future:  date.After(today),
			Align:   alignFor(i, count),
		}
		if i%7 == 0 {
			bars[i].Axis = strconv.Itoa(i + 1)
		}
	}
	v.Chart = chart{
		Walker:    w.Key,
		Bars:      bars,
		Ticks:     ticksFor(axisMax),
		HasGoal:   true,
		GoalPct:   pctOf(goal, axisMax),
		GoalLabel: "Goal " + commas(goal),
		Caption:   "Steps each day in " + first.Format("January 2006"),
	}

	v.Calendar = buildCalendar(bars, first)
	v.CalendarLabel = first.Format("Jan 2006")

	v.finish(logged)
	if logged == 0 {
		v.EmptyText = "No steps logged in " + v.Title + "."
		v.TodayHref = "/"
		return v
	}
	v.Summary = []string{
		fmt.Sprintf("You reached your goal on %d of the %s you logged.", metGoal, plural(logged, "day")),
		fmt.Sprintf("Best day: %s, with %s steps.", bars[bestDay].Name, commas(values[bestDay])),
		fmt.Sprintf("Average: %s steps a day.", commas(v.Total/logged)),
	}
	return v
}

func buildYear(first, today time.Time, months map[time.Month]MonthTotal, w walker) *periodView {
	v := &periodView{
		Kind:       "year",
		Walker:     w,
		Title:      first.Format("2006"),
		PrevHref:   yearPath(first.AddDate(-1, 0, 0)),
		TableLabel: "Month",
	}
	if first.Year() < today.Year() {
		v.NextHref = yearPath(first.AddDate(1, 0, 0))
	}

	values := make([]int, 12)
	bestMonth, logged := -1, 0
	for i := range values {
		total := months[time.Month(i+1)]
		values[i] = total.Steps
		v.Total += total.Steps
		logged += total.ActiveDays
		if total.Steps > 0 && (bestMonth < 0 || total.Steps > values[bestMonth]) {
			bestMonth = i
		}
	}

	axisMax := niceCeil(maxOf(values))
	bars := make([]bar, 12)
	for i, n := range values {
		date := time.Date(first.Year(), time.Month(i+1), 1, 0, 0, 0, 0, time.UTC)
		bars[i] = bar{
			Axis:      date.Format("Jan"),
			AxisShort: date.Format("Jan")[:1],
			Name:      date.Format("January"),
			Href:      monthPath(date),
			Value:     n,
			Pct:       pctOf(n, axisMax),
			MetGoal:   true, // a year has no monthly goal, so every bar is the same colour
			Best:      i == bestMonth,
			Current:   date.Equal(firstOfMonth(today)),
			Future:    date.After(today),
			Align:     alignFor(i, 12),
		}
	}
	v.Chart = chart{
		Walker:  w.Key,
		Bars:    bars,
		Ticks:   ticksFor(axisMax),
		Caption: "Steps each month in " + v.Title,
	}

	v.finish(logged)
	if logged == 0 {
		v.EmptyText = "No steps logged in " + v.Title + "."
		v.TodayHref = "/"
		return v
	}
	v.Summary = []string{
		fmt.Sprintf("Best month: %s, with %s steps.", bars[bestMonth].Name, commas(values[bestMonth])),
		fmt.Sprintf("Average: %s steps a day, across the %s you logged.", commas(v.Total/logged), plural(logged, "day")),
	}
	return v
}

func (v *periodView) finish(logged int) {
	if logged > 0 {
		v.Distance = distanceText(v.Total)
		v.Compare = compare(v.Total)
	}
}

func firstOfMonth(d time.Time) time.Time {
	return time.Date(d.Year(), d.Month(), 1, 0, 0, 0, 0, time.UTC)
}

func alignFor(i, count int) string {
	switch {
	case i < count/3:
		return "left"
	case i >= count*2/3:
		return "right"
	}
	return "center"
}

func maxOf(values []int) int {
	m := 0
	for _, n := range values {
		m = max(m, n)
	}
	return m
}

func pctOf(n, axisMax int) string {
	if axisMax == 0 {
		return "0"
	}
	return strconv.FormatFloat(float64(n)/float64(axisMax)*100, 'f', 1, 64)
}

// niceCeil rounds up to a clean axis maximum, so bars fill the plot without odd ticks.
func niceCeil(n int) int {
	if n <= 0 {
		return 1000
	}
	mag := int(math.Pow(10, math.Floor(math.Log10(float64(n))))) // 14210 -> 10000
	for _, m := range []int{10, 15, 20, 25, 30, 40, 50, 60, 80, 100} {
		if m*mag/10 >= n {
			return m * mag / 10
		}
	}
	return 10 * mag
}

func ticksFor(axisMax int) []tick {
	return []tick{
		{Label: axisLabel(0, axisMax), Pct: "0"},
		{Label: axisLabel(axisMax/2, axisMax), Pct: "50"},
		{Label: axisLabel(axisMax, axisMax), Pct: "100"},
	}
}

// axisLabel writes ticks in full under 10,000 and compactly once the axis reaches it.
func axisLabel(n, axisMax int) string {
	switch {
	case n == 0:
		return "0"
	case axisMax >= 1_000_000:
		return strconv.FormatFloat(float64(n)/1_000_000, 'f', -1, 64) + "M"
	case axisMax >= 10_000:
		return strconv.FormatFloat(float64(n)/1_000, 'f', -1, 64) + "K"
	}
	return commas(n)
}

func plural(n int, word string) string {
	if n == 1 {
		return "1 " + word
	}
	return commas(n) + " " + word + "s"
}

func commas(n int) string {
	s := strconv.Itoa(n)
	if n < 0 {
		return "-" + commas(-n)
	}
	var b strings.Builder
	for i, r := range s {
		if i > 0 && (len(s)-i)%3 == 0 {
			b.WriteByte(',')
		}
		b.WriteRune(r)
	}
	return b.String()
}
