// Turns stored steps into what each screen shows. Nothing here touches the page or storage.

export const MAX_STEPS = 200_000;
export const DEFAULT_GOAL = 8_000;

// An average adult stride. It turns steps into the "about N km" estimates.
const METERS_PER_STEP = 0.75;

// Walkers the user can pick. ID is what gets saved, so keep it stable. To add one,
// list it here and draw it in art.js.
export const walkers = [
  { id: 1, key: "pip", name: "Pip" },
  { id: 2, key: "miso", name: "Miso" },
  { id: 3, key: "nori", name: "Nori" },
];

// walkerById falls back to the first walker, which is also the default before any choice.
export function walkerById(id) {
  return walkers.find((w) => w.id === id) ?? walkers[0];
}

export function walkerByKey(key) {
  return walkers.find((w) => w.key === key);
}

// Dates are UTC midnights, so a calendar day stays the same day whatever the time zone.
const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

// month is 0-based and out-of-range values roll over, as with Date. setUTCFullYear
// is there because Date.UTC reads the years 0 to 99 as 1900 to 1999.
export function utcDate(year, month, day) {
  const d = new Date(Date.UTC(2000, 0, 1));
  d.setUTCFullYear(year, month, day);
  return d;
}

const pad = (n, width = 2) => String(n).padStart(width, "0");

export const dayKey = (d) => `${pad(d.getUTCFullYear(), 4)}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
const monthKey = (d) => dayKey(d).slice(0, 7);
const yearKey = (d) => dayKey(d).slice(0, 4);

export const addDays = (d, n) => utcDate(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + n);
const addMonths = (d, n) => utcDate(d.getUTCFullYear(), d.getUTCMonth() + n, d.getUTCDate());
const firstOfMonth = (d) => utcDate(d.getUTCFullYear(), d.getUTCMonth(), 1);

const shortDay = (d) => DAYS[d.getUTCDay()].slice(0, 3);
const monthName = (d) => MONTHS[d.getUTCMonth()];
const shortMonth = (d) => monthName(d).slice(0, 3);
const dayName = (d) => `${shortDay(d)} ${d.getUTCDate()} ${shortMonth(d)}`; // Mon 2 Jan
const monthTitle = (d) => `${monthName(d)} ${yearKey(d)}`; // January 2024

// parseDay is null for anything that isn't a real date, like 2024-02-30.
export function parseDay(text) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  if (!m) return null;
  const d = utcDate(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return dayKey(d) === text ? d : null;
}

export function parseMonth(text) {
  return /^\d{4}-\d{2}$/.test(text) ? parseDay(`${text}-01`) : null;
}

export function parseYear(text) {
  return /^\d{4}$/.test(text) ? parseDay(`${text}-01-01`) : null;
}

// Every screen's address is a hash, so the app works on any static host, in any folder.
export const dayPath = (d) => `#/day/${dayKey(d)}`;
export const monthPath = (d) => `#/month/${monthKey(d)}`;
export const yearPath = (d) => `#/year/${yearKey(d)}`;

// tabsFor keeps the month and year tabs on the period being looked at.
export function tabsFor(active, date) {
  return [
    { label: "Day", href: "#/", icon: "day", active: active === "day" },
    { label: "Month", href: monthPath(date), icon: "month", active: active === "month" },
    { label: "Year", href: yearPath(date), icon: "year", active: active === "year" },
  ];
}

const CONFETTI = [
  { x: -46, y: -52, color: "#FF5C8A", delay: 0 }, { x: -30, y: -74, color: "#FDF8E8", delay: 40 }, { x: -12, y: -60, color: "#3F5BD9", delay: 90 },
  { x: 4, y: -84, color: "#FF5C8A", delay: 20 }, { x: 20, y: -66, color: "#FDF8E8", delay: 70 }, { x: 36, y: -78, color: "#3F5BD9", delay: 30 },
  { x: 50, y: -50, color: "#FF5C8A", delay: 60 }, { x: -56, y: -30, color: "#3F5BD9", delay: 110 }, { x: 60, y: -28, color: "#FDF8E8", delay: 100 },
];

// buildDay's opts carry the outcome of a form into the re-rendered day.
export function buildDay(date, today, steps, goal, walker, opts = {}) {
  const v = {
    date: dayKey(date),
    prevHref: dayPath(addDays(date, -1)),
    nextHref: "",
    isToday: date.getTime() === today.getTime(),
    steps,
    goal,
    distance: distanceText(steps),
    compare: null,
    moreFacts: [],
    animate: Boolean(opts.animate),
    celebrate: false,
    error: opts.error ?? "",
    goalError: opts.goalError ?? "",
    input: opts.input ?? "",
    quickAdds: [500, 1000, 2500],
    confetti: [],
    walker,
    walkers,
  };
  if (v.isToday) {
    v.title = "Today";
    v.heading = "Today";
  } else {
    v.title = `${dayName(date)} ${yearKey(date)}`;
    v.heading = dayName(date);
    if (date.getUTCFullYear() !== today.getUTCFullYear()) {
      v.heading = `${date.getUTCDate()} ${shortMonth(date)} ${yearKey(date)}`;
    }
    v.nextHref = dayPath(addDays(date, 1));
  }
  if (!v.error && steps > 0) v.input = String(steps);

  const found = comparisons(steps);
  if (found.length > 0) {
    v.compare = found[0];
    v.moreFacts = found.slice(1);
  }

  v.pct = (Math.min((steps / goal) * 100, 100)).toFixed(1);
  if (steps === 0 && v.isToday) {
    v.mood = "asleep";
    v.status = `${walker.name} is still asleep. Log your first steps.`;
  } else if (steps === 0) {
    v.mood = "asleep";
    v.status = "No steps logged this day.";
  } else if (steps >= goal) {
    v.mood = "summit";
    v.status = `${walker.name} reached the flag.`;
  } else {
    v.mood = "walking";
    v.status = `${commas(goal - steps)} to the flag`;
  }
  if (opts.animate && opts.before < goal && steps >= goal) {
    v.celebrate = true;
    v.confetti = CONFETTI;
  }
  return v;
}

// Landmarks run from longest to shortest. Each art name is drawn in art.js.
const LANDMARKS = [
  { km: 3940, art: "route66", one: "the length of Route 66", many: (n) => `the length of Route 66 ${n} times` },
  { km: 446, art: "canyon", one: "the length of the Grand Canyon", many: (n) => `the length of the Grand Canyon ${n} times` },
  { km: 42.195, art: "medal", one: "a full marathon", many: (n) => `${n} marathons` },
  { km: 8.849, art: "everest", one: "the height of Everest", many: (n) => `the height of Everest ${n} times` },
  { km: 2.737, art: "bridge", one: "the length of the Golden Gate Bridge", many: (n) => `the length of the Golden Gate Bridge ${n} times` },
  { km: 0.828, art: "burj", one: "the height of the Burj Khalifa", many: (n) => `the height of the Burj Khalifa ${n} times` },
  { km: 0.33, art: "eiffel", one: "one Eiffel Tower", many: (n) => `${n} Eiffel Towers end to end` },
  { km: 0.105, art: "pitch", one: "one football pitch", many: (n) => `${n} football pitches end to end` },
  { km: 0.05, art: "pool", one: "one Olympic pool", many: (n) => `${n} Olympic pools end to end` },
];

export const landmarkArt = LANDMARKS.map((l) => l.art);

// How many facts the Day screen shows: the picture's fact and two more.
const MAX_COMPARISONS = 3;

// comparisons lists the landmarks this distance covers, biggest first.
export function comparisons(steps) {
  const km = kilometres(steps);
  const found = [];
  for (const l of LANDMARKS) {
    const count = Math.trunc(km / l.km);
    if (count < 1) continue;
    found.push({ art: l.art, count, text: count > 1 ? l.many(count) : l.one });
    if (found.length === MAX_COMPARISONS) break;
  }
  return found;
}

// compare is the single biggest landmark, which is the one that gets a picture.
export function compare(steps) {
  return comparisons(steps)[0] ?? null;
}

const kilometres = (steps) => (steps * METERS_PER_STEP) / 1000;

function distanceText(steps) {
  const km = kilometres(steps);
  return km < 100 ? `About ${km.toFixed(1)} km` : `About ${commas(Math.round(km))} km`;
}

// buildCalendar lays a month out in weeks that start on Monday.
function buildCalendar(bars, first) {
  const days = bars.map((b, i) => {
    const d = { day: i + 1, steps: "", reached: false, href: b.href, today: b.current, future: b.future, label: b.name, start: 0 };
    if (b.future) return d;
    if (b.value === 0) {
      d.label += ": no steps logged";
    } else if (b.metGoal) {
      d.steps = shortSteps(b.value);
      d.reached = true;
      d.label += `: ${commas(b.value)} steps, goal reached`;
    } else {
      d.steps = shortSteps(b.value);
      d.label += `: ${commas(b.value)} steps`;
    }
    return d;
  });
  days[0].start = ((first.getUTCDay() + 6) % 7) + 1;
  return days;
}

// shortSteps fits a count into a calendar cell: 8,391, 12.5K or 200K.
export function shortSteps(n) {
  if (n < 10_000) return commas(n);
  if (n < 99_950) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}K`;
  return `${Math.round(n / 1000)}K`;
}

// buildMonth's days are the logged steps keyed by day of the month.
export function buildMonth(first, today, days, goal, walker) {
  const v = {
    kind: "month",
    walker,
    title: monthTitle(first),
    prevHref: monthPath(addMonths(first, -1)),
    nextHref: "",
    tableLabel: "Day",
    total: 0,
    distance: "",
    compare: null,
    calendar: null,
    calendarLabel: `${shortMonth(first)} ${yearKey(first)}`,
    summary: [],
    emptyText: "",
    todayHref: "",
  };
  if (first < firstOfMonth(today)) v.nextHref = monthPath(addMonths(first, 1));

  const count = utcDate(first.getUTCFullYear(), first.getUTCMonth() + 1, 0).getUTCDate();
  const values = [];
  let bestDay = -1;
  let logged = 0;
  let metGoal = 0;
  for (let d = 1; d <= count; d++) {
    const n = days[d] ?? 0;
    values.push(n);
    v.total += n;
    if (n > 0) {
      logged++;
      if (bestDay < 0 || n > values[bestDay]) bestDay = d - 1;
    }
    if (n >= goal) metGoal++;
  }

  const axisMax = niceCeil(Math.max(maxOf(values), goal));
  const bars = values.map((n, i) => {
    const date = addDays(first, i);
    return {
      axis: i % 7 === 0 ? String(i + 1) : "",
      axisShort: "",
      name: dayName(date),
      href: dayPath(date),
      value: n,
      pct: pctOf(n, axisMax),
      metGoal: n >= goal,
      best: i === bestDay,
      current: date.getTime() === today.getTime(),
      future: date > today,
      align: alignFor(i, count),
    };
  });
  v.chart = {
    walker: walker.key,
    bars,
    ticks: ticksFor(axisMax),
    hasGoal: true,
    goalPct: pctOf(goal, axisMax),
    goalLabel: `Goal ${commas(goal)}`,
    caption: `Steps each day in ${monthTitle(first)}`,
  };
  v.calendar = buildCalendar(bars, first);

  finish(v, logged);
  if (logged === 0) {
    v.emptyText = `No steps logged in ${v.title}.`;
    v.todayHref = "#/";
    return v;
  }
  v.summary = [
    `You reached your goal on ${metGoal} of the ${plural(logged, "day")} you logged.`,
    `Best day: ${bars[bestDay].name}, with ${commas(values[bestDay])} steps.`,
    `Average: ${commas(Math.trunc(v.total / logged))} steps a day.`,
  ];
  return v;
}

// buildYear's months are totals keyed by month number, 1 to 12.
export function buildYear(first, today, months, walker) {
  const v = {
    kind: "year",
    walker,
    title: yearKey(first),
    prevHref: yearPath(utcDate(first.getUTCFullYear() - 1, 0, 1)),
    nextHref: "",
    tableLabel: "Month",
    total: 0,
    distance: "",
    compare: null,
    calendar: null,
    calendarLabel: "",
    summary: [],
    emptyText: "",
    todayHref: "",
  };
  if (first.getUTCFullYear() < today.getUTCFullYear()) {
    v.nextHref = yearPath(utcDate(first.getUTCFullYear() + 1, 0, 1));
  }

  const values = [];
  let bestMonth = -1;
  let logged = 0;
  for (let i = 0; i < 12; i++) {
    const total = months[i + 1] ?? { steps: 0, activeDays: 0 };
    values.push(total.steps);
    v.total += total.steps;
    logged += total.activeDays;
    if (total.steps > 0 && (bestMonth < 0 || total.steps > values[bestMonth])) bestMonth = i;
  }

  const axisMax = niceCeil(maxOf(values));
  const bars = values.map((n, i) => {
    const date = utcDate(first.getUTCFullYear(), i, 1);
    return {
      axis: shortMonth(date),
      axisShort: shortMonth(date)[0],
      name: monthName(date),
      href: monthPath(date),
      value: n,
      pct: pctOf(n, axisMax),
      metGoal: true, // a year has no monthly goal, so every bar is the same colour
      best: i === bestMonth,
      current: date.getTime() === firstOfMonth(today).getTime(),
      future: date > today,
      align: alignFor(i, 12),
    };
  });
  v.chart = {
    walker: walker.key,
    bars,
    ticks: ticksFor(axisMax),
    hasGoal: false,
    goalPct: "",
    goalLabel: "",
    caption: `Steps each month in ${v.title}`,
  };

  finish(v, logged);
  if (logged === 0) {
    v.emptyText = `No steps logged in ${v.title}.`;
    v.todayHref = "#/";
    return v;
  }
  v.summary = [
    `Best month: ${bars[bestMonth].name}, with ${commas(values[bestMonth])} steps.`,
    `Average: ${commas(Math.trunc(v.total / logged))} steps a day, across the ${plural(logged, "day")} you logged.`,
  ];
  return v;
}

function finish(v, logged) {
  if (logged > 0) {
    v.distance = distanceText(v.total);
    v.compare = compare(v.total);
  }
}

function alignFor(i, count) {
  if (i < Math.trunc(count / 3)) return "left";
  if (i >= Math.trunc((count * 2) / 3)) return "right";
  return "center";
}

const maxOf = (values) => Math.max(0, ...values);

const pctOf = (n, axisMax) => (axisMax === 0 ? "0" : ((n / axisMax) * 100).toFixed(1));

// niceCeil rounds up to a clean axis maximum, so bars fill the plot without odd ticks.
export function niceCeil(n) {
  if (n <= 0) return 1000;
  const mag = 10 ** Math.floor(Math.log10(n)); // 14210 -> 10000
  for (const m of [10, 15, 20, 25, 30, 40, 50, 60, 80, 100]) {
    const candidate = Math.trunc((m * mag) / 10);
    if (candidate >= n) return candidate;
  }
  return 10 * mag;
}

function ticksFor(axisMax) {
  return [
    { label: axisLabel(0, axisMax), pct: "0" },
    { label: axisLabel(Math.trunc(axisMax / 2), axisMax), pct: "50" },
    { label: axisLabel(axisMax, axisMax), pct: "100" },
  ];
}

// axisLabel writes ticks in full under 10,000 and compactly once the axis reaches it.
function axisLabel(n, axisMax) {
  if (n === 0) return "0";
  if (axisMax >= 1_000_000) return `${n / 1_000_000}M`;
  if (axisMax >= 10_000) return `${n / 1_000}K`;
  return commas(n);
}

export function plural(n, word) {
  return n === 1 ? `1 ${word}` : `${commas(n)} ${word}s`;
}

export function commas(n) {
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// parseCount reads a typed number, allowing commas. It's null unless the result is a
// whole number from min to max.
export function parseCount(raw, min, max) {
  const text = String(raw ?? "").trim().replaceAll(",", "");
  if (!/^[+-]?\d+$/.test(text)) return null;
  const n = Number(text);
  return n >= min && n <= max ? n : null;
}
