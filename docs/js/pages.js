// Decides which screen an address shows, and what each form does. Keeping this apart from
// the page itself means it can all be tested without a browser.
import { backupScreen, clearScreen, dayScreen, nav, notFoundScreen, periodScreen } from "./screens.js";
import { html } from "./html.js";
import {
  MAX_STEPS, buildDay, buildMonth, buildYear, commas, dayKey, parseCount, parseDay, parseMonth, parseYear,
  tabsFor, walkerById, walkerByKey,
} from "./views.js";

const MIN_GOAL = 100;

const screen = (title, tabs, body) => ({ title, html: html`${body}${nav(tabs)}`.toString() });

function dayPage(store, date, today, opts) {
  const walker = walkerById(store.walkerId());
  const v = buildDay(date, today, store.steps(dayKey(date)), store.goal(), walker, opts);
  return screen(v.title, tabsFor("day", date), dayScreen(v));
}

function notFound(store, today, title) {
  const walker = walkerById(store.walkerId());
  return screen(title, tabsFor("", today), notFoundScreen({ title, walker }));
}

const monthIn = (date) => dayKey(date).slice(0, 7);
const yearIn = (date) => dayKey(date).slice(0, 4);

// formatDate writes a stored time as a date in the visitor's own time zone: 5 Nov 2026.
function formatDate(iso) {
  const when = new Date(iso);
  if (Number.isNaN(when.getTime())) return "";
  return when.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

// page builds the screen for an address. opts carry the outcome of a form or file pick.
export function page(store, hash, today, opts = {}) {
  const parts = hash.replace(/^#/, "").split("/").filter(Boolean);
  const [name, value] = parts;
  const walker = walkerById(store.walkerId());

  if (parts.length === 0) return dayPage(store, today, today, opts);

  if (parts.length === 2 && name === "day") {
    const date = parseDay(value);
    if (!date) return notFound(store, today, "We can't find that day");
    if (date > today) return notFound(store, today, "That day hasn't happened yet");
    return dayPage(store, date, today, opts);
  }
  if (parts.length === 2 && name === "month") {
    const first = parseMonth(value);
    if (!first) return notFound(store, today, "We can't find that month");
    const v = buildMonth(first, today, store.monthSteps(monthIn(first)), store.goal(), walker);
    return screen(v.title, tabsFor("month", first), periodScreen(v));
  }
  if (parts.length === 2 && name === "year") {
    const first = parseYear(value);
    if (!first) return notFound(store, today, "We can't find that year");
    const v = buildYear(first, today, store.yearSteps(yearIn(first)), walker);
    return screen(v.title, tabsFor("year", first), periodScreen(v));
  }
  if (parts.length === 1 && name === "clear") {
    return screen("Clear all data", tabsFor("", today), clearScreen({ ...store.totals(), walker }));
  }
  if (parts.length === 1 && name === "backup") {
    const v = {
      walker,
      lastBackup: store.lastBackup() ? formatDate(store.lastBackup()) : "",
      pending: opts.pending ?? null,
      current: store.totals(),
      importError: opts.importError ?? "",
    };
    return screen("Back up your steps", tabsFor("", today), backupScreen(v));
  }
  return notFound(store, today, "We can't find that page");
}

// submit carries out a form. fields holds the form's values and date is the day it was for.
// It returns what to show next: opts for page(), where to scroll, and any change of address.
export function submit(store, action, fields, date) {
  switch (action) {
    case "steps": {
      const steps = parseCount(fields.steps, 0, MAX_STEPS);
      if (steps === null) {
        return { opts: { error: `Enter a whole number from 0 to ${commas(MAX_STEPS)}.`, input: fields.steps } };
      }
      const before = store.steps(date);
      store.setSteps(date, steps);
      return { opts: { animate: true, before } };
    }
    case "add": {
      const steps = parseCount(fields.steps, 1, MAX_STEPS);
      if (steps === null) {
        return { opts: { error: `Enter a whole number from 1 to ${commas(MAX_STEPS)}.` } };
      }
      const before = store.steps(date);
      store.addSteps(date, steps);
      return { opts: { animate: true, before } };
    }
    case "goal": {
      const goal = parseCount(fields.goal, MIN_GOAL, MAX_STEPS);
      if (goal === null) {
        // The error is far below the top of the page, so go to it rather than hide it.
        return { opts: { goalError: `Enter a whole number from ${commas(MIN_GOAL)} to ${commas(MAX_STEPS)}.` }, scrollTo: "#goal-row" };
      }
      store.setGoal(goal);
      // before is set past any goal so that moving the flag never sets off the confetti.
      return { opts: { animate: true, before: MAX_STEPS } };
    }
    case "walker": {
      const picked = walkerByKey(fields.walker);
      if (picked) store.setWalkerId(picked.id);
      return { opts: {} };
    }
    case "clear":
      store.clearAll();
      // Replacing the address keeps the back button from returning to the confirmation.
      return { opts: {}, replaceWith: "#/", toast: "All data cleared." };
    default:
      throw new Error(`unknown form ${action}`);
  }
}
