// Tests for the browser app. Run with: npm test
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { test } from "node:test";
import { landmark } from "../docs/js/art.js";
import { page, submit } from "../docs/js/pages.js";
import { STORE_KEY, createStore, parseBackup } from "../docs/js/store.js";
import {
  DEFAULT_GOAL, MAX_STEPS, addDays, buildDay, buildMonth, buildYear, commas, compare, dayKey, landmarkArt, niceCeil,
  parseCount, parseDay, shortSteps, utcDate, walkers,
} from "../docs/js/views.js";

function fakeStorage(initial = {}) {
  const items = new Map(Object.entries(initial));
  return {
    items,
    getItem: (key) => items.get(key) ?? null,
    setItem: (key, value) => items.set(key, String(value)),
    removeItem: (key) => items.delete(key),
  };
}

const newStore = () => createStore(fakeStorage());
const TODAY = utcDate(2024, 2, 20); // 20 March 2024
const DAY = "2024-03-10";
const show = (store, hash, opts) => page(store, hash, TODAY, opts).html;

// Mirrors what a redraw does after a form, for the tests that read the result.
function act(store, action, fields, date = DAY, hash = `#/day/${date}`) {
  const result = submit(store, action, fields, date);
  return { ...result, html: show(store, hash, result.opts) };
}

test("saving and adding steps", () => {
  const store = newStore();
  assert.match(act(store, "steps", { steps: "4,000" }).html, /4,000 to the flag/);

  const crossed = act(store, "add", { steps: "4000" }).html;
  assert.match(crossed, /Pip reached the flag\./);
  assert.match(crossed, /class="confetti"/, "crossing the goal should celebrate");

  assert.doesNotMatch(act(store, "add", { steps: "500" }).html, /class="confetti"/, "confetti should only fire on first crossing");
  assert.equal(store.steps(DAY), 8500);
});

test("adding caps the total", () => {
  const store = newStore();
  act(store, "steps", { steps: "199999" });
  act(store, "add", { steps: "500" });
  assert.equal(store.steps(DAY), MAX_STEPS);
});

test("invalid steps keep the input and explain", () => {
  const store = newStore();
  for (const bad of ["", "abc", "-5", "1.5", "200001"]) {
    const { html } = act(store, "steps", { steps: bad });
    assert.match(html, /Enter a whole number/, `${bad}: missing error`);
    assert.equal(store.steps(DAY), 0, `${bad}: stored something`);
  }
  assert.match(act(store, "steps", { steps: "abc" }).html, /value="abc"/);
});

test("typed text can't become markup", () => {
  const { html } = act(newStore(), "steps", { steps: `"><script>alert(1)</script>` });
  assert.doesNotMatch(html, /<script>/);
  assert.match(html, /&lt;script&gt;/);
});

test("setting the goal", () => {
  const store = newStore();
  act(store, "steps", { steps: "9000" });
  for (const bad of ["", "abc", "50", "200001"]) act(store, "goal", { goal: bad });
  assert.equal(store.goal(), DEFAULT_GOAL, "invalid goals changed the goal");
  assert.equal(act(store, "goal", { goal: "abc" }).scrollTo, "#goal-row", "a goal error should stay on the goal row");

  const { html } = act(store, "goal", { goal: "5,000" });
  assert.equal(store.goal(), 5000);
  assert.match(html, /Pip reached the flag\./);
  assert.doesNotMatch(html, /class="confetti"/, "moving the flag shouldn't set off the confetti");

  act(store, "steps", { steps: "10000" });
  act(store, "add", { steps: "2500" });
  assert.equal(store.goal(), 5000, "saving steps changed the goal");
});

test("picking a walker", () => {
  const store = newStore();
  act(store, "steps", { steps: "9000" });
  assert.match(show(store, `#/day/${DAY}`), /Pip reached the flag\./, "Pip walks until another is picked");

  const { html } = act(store, "walker", { walker: "miso" });
  assert.match(html, /Miso reached the flag\./);
  assert.match(html, /Miso is 100\.0%/);
  assert.doesNotMatch(html, /class="confetti"/);

  for (const hash of [`#/day/${DAY}`, "#/month/2024-03", "#/year/2024", "#/month/2020-06"]) {
    assert.match(show(store, hash), /#F4792B/, `${hash} should draw Miso`);
  }

  act(store, "walker", { walker: "dragon" });
  assert.equal(store.walkerId(), 2, "unknown walker changed the saved choice");

  store.setWalkerId(99);
  assert.match(show(store, `#/day/${DAY}`), /Pip reached the flag\./, "an unknown saved ID falls back to Pip");
});

test("clearing all data", () => {
  const storage = fakeStorage();
  const store = createStore(storage);
  act(store, "steps", { steps: "9000" }, "2024-03-10");
  act(store, "steps", { steps: "1000" }, "2024-03-11");
  act(store, "steps", { steps: "0" }, "2024-03-12");
  act(store, "goal", { goal: "5000" });
  act(store, "walker", { walker: "nori" });
  store.noteBackup(new Date());
  storage.setItem("pip-steps:theme", "night");

  const confirm = show(store, "#/clear");
  assert.match(confirm, /2 days of steps/);
  assert.match(confirm, /10,000 steps in total/);
  assert.equal(store.totals().days, 2, "opening the confirmation changed the data");

  const result = act(store, "clear", {}, undefined, "#/");
  assert.equal(result.replaceWith, "#/");
  assert.equal(result.toast, "All data cleared.");
  assert.match(result.html, /Pip is still asleep/);

  assert.deepEqual(store.totals(), { days: 0, steps: 0 });
  assert.equal(store.goal(), DEFAULT_GOAL);
  assert.equal(store.walkerId(), 0);
  assert.equal(store.lastBackup(), null);
  assert.equal(storage.getItem(STORE_KEY), null, "the data should be gone from storage itself");
  assert.equal(storage.getItem("pip-steps:theme"), "night", "the theme belongs to the device");

  act(store, "steps", { steps: "42" });
  assert.deepEqual(store.totals(), { days: 1, steps: 42 }, "the app keeps working afterwards");
});

test("a zero-step day leaves nothing behind", () => {
  const storage = fakeStorage();
  const store = createStore(storage);
  store.setSteps(DAY, 100);
  store.setSteps(DAY, 0);
  assert.deepEqual(JSON.parse(storage.getItem(STORE_KEY)).steps, {});
});

test("the calendar", () => {
  const first = utcDate(2024, 1, 1); // a leap February starting on a Thursday
  const today = utcDate(2024, 1, 20);
  const got = buildMonth(first, today, { 1: 9000, 2: 3215, 3: 0, 19: 12451 }, 8000, walkers[0]).calendar;
  assert.equal(got.length, 29);
  assert.equal(got[0].start, 4);
  got.slice(1).forEach((d) => assert.equal(d.start, 0));

  const checks = [
    [1, "9,000", "Thu 1 Feb: 9,000 steps, goal reached", true, false, false],
    [2, "3,215", "Fri 2 Feb: 3,215 steps", false, false, false],
    [3, "", "Sat 3 Feb: no steps logged", false, false, false],
    [4, "", "Sun 4 Feb: no steps logged", false, false, false],
    [19, "12.5K", "Mon 19 Feb: 12,451 steps, goal reached", true, false, false],
    [20, "", "Tue 20 Feb: no steps logged", false, true, false],
    [21, "", "Wed 21 Feb", false, false, true],
    [29, "", "Thu 29 Feb", false, false, true],
  ];
  for (const [day, steps, label, reached, isToday, future] of checks) {
    const d = got[day - 1];
    assert.deepEqual([d.day, d.steps, d.label, d.reached, d.today, d.future], [day, steps, label, reached, isToday, future]);
  }

  const starts = [[utcDate(2024, 0, 1), 1], [utcDate(2024, 8, 1), 7], [utcDate(2024, 5, 1), 6]];
  for (const [date, want] of starts) {
    assert.equal(buildMonth(date, today, {}, 8000, walkers[0]).calendar[0].start, want);
  }
  assert.equal(buildYear(first, today, {}, walkers[0]).calendar, null);
});

test("the calendar on the page", () => {
  const store = newStore();
  store.setSteps("2024-02-05", 9000);
  const body = show(store, "#/month/2024-02");
  for (const want of ["Your calendar", "grid-column-start:4", 'aria-label="Mon 5 Feb: 9,000 steps, goal reached"', 'aria-label="Tue 6 Feb: no steps logged"']) {
    assert.ok(body.includes(want), `month page missing ${want}`);
  }
  const empty = show(store, "#/month/2020-06");
  assert.ok(empty.includes("No steps logged in"));
  assert.ok(empty.includes('href="#/day/2020-06-15"'), "an empty month should show its calendar");
  assert.ok(!show(store, "#/year/2024").includes("Your calendar"));
});

test("the calendar's month arrows", () => {
  const store = newStore();
  const calendarOf = (hash) => show(store, hash).split('id="calendar-heading"')[1];

  const past = calendarOf("#/month/2024-02");
  for (const want of ['href="#/month/2024-01"', 'href="#/month/2024-03"', "Feb 2024", 'data-keep-scroll="#calendar-heading"']) {
    assert.ok(past.includes(want), `past month's calendar missing ${want}`);
  }
  assert.ok(calendarOf("#/month/2020-06").includes('href="#/month/2020-05"'), "empty months still link back");

  const current = calendarOf("#/month/2024-03");
  assert.ok(!current.includes('aria-label="Next month"'), "no next month from the current one");
  assert.ok(current.includes('aria-label="Previous month"'));
});

test("months with nothing logged are tall enough to keep the arrows still", () => {
  const store = newStore();
  assert.match(show(store, "#/month/2020-06"), /<section class="mt-5 min-h-dvh"/);
  store.setSteps("2024-02-05", 9000);
  assert.doesNotMatch(show(store, "#/month/2024-02"), /min-h-dvh/);
});

test("short step counts", () => {
  const cases = {
    1: "1", 999: "999", 8391: "8,391", 9999: "9,999", 10000: "10K", 12451: "12.5K",
    12000: "12K", 99949: "99.9K", 99950: "100K", 100000: "100K", 199600: "200K", 200000: "200K",
  };
  for (const [n, want] of Object.entries(cases)) assert.equal(shortSteps(Number(n)), want);
});

test("future days can't be opened, and bad addresses are explained", () => {
  const store = newStore();
  assert.match(show(store, `#/day/${dayKey(addDays(TODAY, 3))}`), /That day hasn&#39;t happened yet/);
  assert.match(show(store, `#/day/${dayKey(TODAY)}`), /Your steps today/);
  assert.match(show(store, "#/day/2024-02-30"), /We can&#39;t find that day/);
  assert.match(show(store, "#/month/2024-13"), /We can&#39;t find that month/);
  assert.match(show(store, "#/year/abcd"), /We can&#39;t find that year/);
  assert.match(show(store, "#/nonsense"), /We can&#39;t find that page/);
  assert.match(show(store, ""), /Your steps today/);
  assert.match(show(store, "#/"), /Your steps today/);
});

test("month and year totals", () => {
  const store = newStore();
  store.setSteps("2024-02-29", 10000); // leap day, the last bar of the month
  store.setSteps("2024-02-01", 2000);
  store.setSteps("2024-03-15", 5000);
  store.setSteps("2023-02-10", 9999); // another year, must stay out

  const month = show(store, "#/month/2024-02");
  for (const want of ["12,000", "Thu 29 Feb", "reached your goal on 1 of the 2 days", "Best day: Thu 29 Feb"]) {
    assert.ok(month.includes(want), `month page missing ${want}`);
  }
  assert.equal(month.split('aria-label="Thu 29 Feb: 10,000 steps"').length - 1, 1);

  const year = show(store, "#/year/2024");
  for (const want of ["17,000", "Best month: February, with 12,000 steps", "5,666 steps a day, across the 3 days"]) {
    assert.ok(year.includes(want), `year page missing ${want}`);
  }
});

test("empty periods invite logging", () => {
  for (const hash of ["#/month/2020-06", "#/year/2020"]) {
    const body = show(newStore(), hash);
    assert.ok(body.includes("No steps logged in") && body.includes("Log today's steps"), hash);
  }
});

test("comparisons", () => {
  const cases = [
    [50, ""], [100, "one Olympic pool"], [200, "one football pitch"], [500, "one Eiffel Tower"],
    [2000, "the height of the Burj Khalifa"], [5000, "the length of the Golden Gate Bridge"],
    [8000, "the length of the Golden Gate Bridge 2 times"], [12000, "the height of Everest"],
    [50000, "the height of Everest 4 times"], [120000, "2 marathons"], [600000, "the length of the Grand Canyon"],
    [2400000, "the length of the Grand Canyon 4 times"], [6000000, "the length of Route 66"],
  ];
  for (const [steps, want] of cases) assert.equal(compare(steps)?.text ?? "", want, `${steps} steps`);
});

test("the day shows more facts", () => {
  const facts = (steps) => buildDay(TODAY, TODAY, steps, 8000, walkers[0]).moreFacts.map((f) => f.text);
  assert.deepEqual(facts(50), []);
  assert.deepEqual(facts(100), []);
  assert.deepEqual(facts(500), ["3 football pitches end to end", "7 Olympic pools end to end"]);
  assert.deepEqual(facts(2933), ["6 Eiffel Towers end to end", "20 football pitches end to end"]);
});

test("every landmark has a drawing", () => {
  for (const art of landmarkArt) assert.ok(landmark(art), `${art} has no drawing`);
});

test("axis maximums and commas", () => {
  const axes = { 0: 1000, 7: 8, 800: 800, 8000: 8000, 8001: 10000, 14210: 15000, 240000: 250000, 1000: 1000 };
  for (const [n, want] of Object.entries(axes)) assert.equal(niceCeil(Number(n)), want, `niceCeil(${n})`);
  const numbers = { 0: "0", 999: "999", 1000: "1,000", 1234567: "1,234,567" };
  for (const [n, want] of Object.entries(numbers)) assert.equal(commas(Number(n)), want);
});

test("reading numbers and dates", () => {
  assert.equal(parseCount(" 1,234 ", 0, 5000), 1234);
  assert.equal(parseCount("1e3", 0, 5000), null);
  assert.equal(parseCount(undefined, 0, 5000), null);
  assert.equal(parseDay("2024-02-29") && dayKey(parseDay("2024-02-29")), "2024-02-29");
  assert.equal(parseDay("2023-02-29"), null);
  assert.equal(parseDay("2024-2-9"), null);
});

test("backups survive a round trip, and restore replaces everything", () => {
  const store = newStore();
  store.setSteps("2024-03-10", 9000);
  store.setSteps("2024-03-11", 1000);
  store.setGoal(5000);
  store.setWalkerId(3);
  const backup = parseBackup(store.exportBackup(new Date("2024-03-20T10:00:00Z")));
  assert.equal(backup.days, 2);
  assert.equal(backup.totalSteps, 10000);

  const other = newStore();
  other.setSteps("2020-01-01", 7);
  other.restore(backup);
  assert.equal(other.steps("2020-01-01"), 0, "restoring replaces what was there");
  assert.equal(other.steps("2024-03-10"), 9000);
  assert.equal(other.goal(), 5000);
  assert.equal(other.walkerId(), 3);
});

test("bad backups are refused whole", () => {
  const backup = (fields) => JSON.stringify({ app: "pip-steps", version: 1, steps: {}, ...fields });
  const refused = [
    ["not json", /isn't a Pip Steps backup/],
    [JSON.stringify({ hello: "world" }), /isn't a Pip Steps backup/],
    ["null", /isn't a Pip Steps backup/],
    [backup({ version: 2 }), /newer version/],
    [backup({ steps: { "2024-02-30": 5 } }), /damaged/],
    [backup({ steps: { "2024-03-10": -5 } }), /damaged/],
    [backup({ steps: { "2024-03-10": 1.5 } }), /damaged/],
    [backup({ steps: { "2024-03-10": 200001 } }), /damaged/],
    [backup({ steps: { "2024-03-10": 5, __proto__x: 1 } }), /damaged/],
    [backup({ steps: [] }), /damaged/],
    [backup({ goal: 5 }), /damaged/],
    [backup({ walker: "pip" }), /damaged/],
  ];
  for (const [text, message] of refused) assert.throws(() => parseBackup(text), message, text);
});

test("the backup screen", () => {
  const store = newStore();
  assert.match(show(store, "#/backup"), /You haven&#39;t saved a backup yet/);
  assert.match(show(store, "#/backup", { importError: "That file is no good." }), /role="alert"[^>]*>That file is no good\./);

  store.noteBackup(new Date("2024-03-20T12:00:00Z"));
  assert.match(show(store, "#/backup"), /Your last backup was on 20 Mar 2024/);

  const pending = { days: 3, totalSteps: 12000 };
  const empty = show(newStore(), "#/backup", { pending });
  assert.match(empty, /3 days of steps/);
  assert.doesNotMatch(empty, /It replaces/, "nothing to warn about on an empty device");

  store.setSteps(DAY, 500);
  assert.match(show(store, "#/backup", { pending }), /It replaces the <b>1 day of steps<\/b>/);
});

test("damaged saved data is set aside, not overwritten", () => {
  const storage = fakeStorage({ [STORE_KEY]: "{not json" });
  const store = createStore(storage);
  assert.equal(store.steps(DAY), 0);
  assert.ok(store.wasDamaged());
  assert.equal(storage.getItem("pip-steps:damaged"), "{not json");
  store.setSteps(DAY, 10);
  assert.equal(store.steps(DAY), 10, "the app keeps working");
  assert.equal(storage.getItem("pip-steps:damaged"), "{not json", "the copy survives the next save");
});

test("a refused write reaches the caller", () => {
  const storage = fakeStorage();
  storage.setItem = () => { throw new Error("full"); };
  assert.throws(() => submit(createStore(storage), "steps", { steps: "5" }, DAY), /full/);
});

test("the theme toggle stays outside the swapped screens", () => {
  const index = readFileSync(new URL("../docs/index.html", import.meta.url), "utf8");
  assert.equal(index.split('id="theme-toggle"').length - 1, 1);
  assert.ok(!show(newStore(), "#/").includes('id="theme-toggle"'));
});

test("every published file works offline", () => {
  const root = new URL("../docs/", import.meta.url).pathname;
  const walk = (dir) => readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [relative(root, full)];
  });
  const sw = readFileSync(join(root, "sw.js"), "utf8");
  const listed = [...sw.match(/const PRECACHE = \[([\s\S]*?)\];/)[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]);
  // index.html is cached as "./", and the service worker itself never goes in the cache.
  const files = walk(root).filter((f) => f !== "index.html" && f !== "sw.js" && !f.endsWith(".DS_Store"));
  assert.deepEqual(listed.filter((f) => f !== "./").sort(), files.sort());
});

test("nothing personal or absolute slips into the published files", () => {
  const root = new URL("../docs/", import.meta.url).pathname;
  for (const file of ["index.html", "manifest.webmanifest", "sw.js"]) {
    const text = readFileSync(join(root, file), "utf8");
    assert.doesNotMatch(text, /(href|src)="\/[^/]/, `${file} has a path that breaks in a subfolder`);
    assert.doesNotMatch(text, /"\/static\//, `${file} still points at the old app`);
  }
  assert.deepEqual(readdirSync(root).filter((f) => f.endsWith(".db") || f.includes("backup")), []);
});
