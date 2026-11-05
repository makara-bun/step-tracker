// Everything is saved in the browser as one JSON value. The names start with pip-steps
// because a static host can share browser storage between every site on the same domain.
import { DEFAULT_GOAL, MAX_STEPS, parseDay } from "./views.js";

export const STORE_KEY = "pip-steps:data";
const DAMAGED_KEY = "pip-steps:damaged";
const LAST_BACKUP_KEY = "pip-steps:last-backup";

const BACKUP_APP = "pip-steps";
const BACKUP_VERSION = 1;
const MIN_GOAL = 100;

const isCount = (n, min, max) => Number.isInteger(n) && n >= min && n <= max;

// clean checks a saved or imported value and returns it in the stored shape. It throws
// on anything unexpected, so bad data is refused whole rather than half-loaded.
function clean(value) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) throw new Error("not an object");
  const raw = value.steps ?? {};
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) throw new Error("steps is not a map");
  const steps = {};
  for (const [day, n] of Object.entries(raw)) {
    if (!parseDay(day)) throw new Error(`bad date ${day}`);
    if (!isCount(n, 0, MAX_STEPS)) throw new Error(`bad steps on ${day}`);
    if (n > 0) steps[day] = n;
  }
  const goal = value.goal ?? DEFAULT_GOAL;
  if (!isCount(goal, MIN_GOAL, MAX_STEPS)) throw new Error("bad goal");
  const walker = value.walker ?? 0;
  if (!Number.isInteger(walker)) throw new Error("bad walker");
  return { steps, goal, walker };
}

const empty = () => ({ steps: {}, goal: DEFAULT_GOAL, walker: 0 });

// createStore works with anything shaped like localStorage. Writes throw if the browser
// refuses them, for example when storage is full, so the caller can say it didn't save.
export function createStore(storage) {
  let damaged = false;

  function load() {
    const text = storage.getItem(STORE_KEY);
    if (text === null) return empty();
    try {
      return clean(JSON.parse(text));
    } catch {
      // Starting fresh would overwrite this on the next save, so keep a copy first.
      if (!damaged) {
        damaged = true;
        try {
          storage.setItem(DAMAGED_KEY, text);
        } catch {
          // nowhere left to put it
        }
      }
      return empty();
    }
  }

  const save = (data) => storage.setItem(STORE_KEY, JSON.stringify(data));

  function update(change) {
    const data = load();
    change(data);
    save(data);
  }

  return {
    // wasDamaged says whether saved data had to be set aside because it couldn't be read.
    wasDamaged: () => damaged,

    steps: (day) => load().steps[day] ?? 0,

    setSteps(day, steps) {
      update((data) => {
        if (steps > 0) data.steps[day] = steps;
        else delete data.steps[day];
      });
    },

    // addSteps adds to the day's total, capped at the maximum, and returns the new total.
    addSteps(day, steps) {
      let total = 0;
      update((data) => {
        total = Math.min((data.steps[day] ?? 0) + steps, MAX_STEPS);
        data.steps[day] = total;
      });
      return total;
    },

    // monthSteps returns the logged steps in a month ("2024-03"), keyed by day of the month.
    monthSteps(month) {
      const out = {};
      for (const [day, n] of Object.entries(load().steps)) {
        if (day.startsWith(`${month}-`)) out[Number(day.slice(8))] = n;
      }
      return out;
    },

    // yearSteps returns per-month totals for a year ("2024"), keyed by month number.
    yearSteps(year) {
      const out = {};
      for (const [day, n] of Object.entries(load().steps)) {
        if (!day.startsWith(`${year}-`)) continue;
        const month = Number(day.slice(5, 7));
        out[month] ??= { steps: 0, activeDays: 0 };
        out[month].steps += n;
        out[month].activeDays++;
      }
      return out;
    },

    // totals counts the days with steps logged and all the steps on them.
    totals() {
      const values = Object.values(load().steps);
      return { days: values.length, steps: values.reduce((sum, n) => sum + n, 0) };
    },

    goal: () => load().goal,
    setGoal: (goal) => update((data) => { data.goal = goal; }),

    // walkerId is the chosen character, or 0 if none has been picked.
    walkerId: () => load().walker,
    setWalkerId: (id) => update((data) => { data.walker = id; }),

    // clearAll deletes all steps and settings. The theme belongs to the device, so it stays.
    clearAll() {
      storage.removeItem(STORE_KEY);
      storage.removeItem(LAST_BACKUP_KEY);
      storage.removeItem(DAMAGED_KEY);
    },

    exportBackup(now) {
      return `${JSON.stringify({ app: BACKUP_APP, version: BACKUP_VERSION, exportedAt: now.toISOString(), ...load() }, null, 2)}\n`;
    },

    // restore replaces everything saved with a backup that parseBackup has already checked.
    restore(backup) {
      save({ steps: backup.steps, goal: backup.goal, walker: backup.walker });
    },

    lastBackup: () => storage.getItem(LAST_BACKUP_KEY),
    noteBackup: (now) => storage.setItem(LAST_BACKUP_KEY, now.toISOString()),
  };
}

// parseBackup reads a backup file's text. It throws an Error with a message that's fit
// to show the user, and returns the checked data along with how much of it there is.
export function parseBackup(text) {
  const notBackup = "That file isn't a Pip Steps backup, so nothing was changed.";
  let value;
  try {
    value = JSON.parse(text);
  } catch {
    throw new Error(notBackup);
  }
  if (value?.app !== BACKUP_APP) throw new Error(notBackup);
  if (!Number.isInteger(value.version) || value.version > BACKUP_VERSION) {
    throw new Error("That backup came from a newer version of Pip Steps, so nothing was changed.");
  }
  let data;
  try {
    data = clean(value);
  } catch {
    throw new Error("That backup is damaged, so nothing was changed.");
  }
  const counts = Object.values(data.steps);
  return { ...data, days: counts.length, totalSteps: counts.reduce((sum, n) => sum + n, 0) };
}
