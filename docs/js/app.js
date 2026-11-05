// Connects the app to the page: addresses, forms, scrolling, backup files and offline support.
import { page, submit } from "./pages.js";
import { STORE_KEY, createStore, parseBackup } from "./store.js";
import { dayKey, utcDate } from "./views.js";

const view = document.getElementById("view");

const FAILED_TO_SAVE = "Your browser wouldn't save that, so it didn't go through. Its storage may be full or turned off.";

// A browser can refuse storage altogether, for example in some private modes. The app
// still works for this visit, and the visitor gets told it won't last.
function openStorage() {
  try {
    const probe = "pip-steps:probe";
    localStorage.setItem(probe, "1");
    localStorage.removeItem(probe);
    return { storage: localStorage, persistent: true };
  } catch {
    const memory = new Map();
    return {
      persistent: false,
      storage: {
        getItem: (key) => memory.get(key) ?? null,
        setItem: (key, value) => memory.set(key, value),
        removeItem: (key) => memory.delete(key),
      },
    };
  }
}

const { storage, persistent } = openStorage();
const store = createStore(storage);

// "Today" is the visitor's own calendar day, wherever they are.
function today() {
  const now = new Date();
  return utcDate(now.getFullYear(), now.getMonth(), now.getDate());
}

const currentHash = () => location.hash || "#/";

let shownToday = "";

// Reads the bits of the page worth carrying across a redraw, before it's replaced.
function capture() {
  const active = document.activeElement;
  let focus = null;
  if (active && active !== document.body && view.contains(active)) {
    if (active.id) focus = `#${CSS.escape(active.id)}`;
    else if (active.name) focus = `[name="${CSS.escape(active.name)}"][value="${CSS.escape(active.value)}"]`;
  }
  const walker = {};
  for (const id of ["pip", "trail"]) {
    walker[id] = document.getElementById(id)?.getAttribute("style") ?? null;
  }
  return { focus, walker };
}

// Puts the old position back for a moment, so the walker and trail move to the new one.
function settle(walker) {
  for (const [id, before] of Object.entries(walker)) {
    const el = document.getElementById(id);
    if (!el || before === null) continue;
    const after = el.getAttribute("style");
    if (after === before) continue;
    el.setAttribute("style", before);
    getComputedStyle(el).opacity; // applies the old position before the new one is set
    el.setAttribute("style", after);
  }
}

function draw(opts = {}) {
  const before = capture();
  const now = today();
  const screen = page(store, currentHash(), now, opts);
  document.title = `${screen.title} - Pip Steps`;
  view.innerHTML = screen.html;
  shownToday = dayKey(now);
  settle(before.walker);
  if (before.focus) view.querySelector(before.focus)?.focus({ preventScroll: true });
}

// The browser can't put the scroll position back by itself, because each screen is drawn
// after it arrives. So this remembers where each step of the history was left.
history.scrollRestoration = "manual";
const scrollPositions = new Map();
let entryId = 0;
let nextScrollTarget = null;

function adoptHistoryEntry() {
  if (history.state?.pipEntry) {
    entryId = history.state.pipEntry;
    return true;
  }
  entryId = Date.now() + Math.random();
  history.replaceState({ pipEntry: entryId }, "");
  return false;
}

addEventListener("scroll", () => scrollPositions.set(entryId, scrollY), { passive: true });

function scrollToTarget(target) {
  const el = target && view.querySelector(target);
  if (el) el.scrollIntoView({ block: "start" });
  else scrollTo(0, 0);
}

let pendingRestore = null; // a checked backup, waiting for the visitor to confirm it

addEventListener("hashchange", () => {
  pendingRestore = null;
  const returning = adoptHistoryEntry();
  draw();
  if (returning) {
    scrollTo(0, scrollPositions.get(entryId) ?? 0);
  } else {
    scrollToTarget(nextScrollTarget);
  }
  nextScrollTarget = null;
});

// Links back to the screen you're on don't change the address, so they just go to the top.
document.addEventListener("click", (event) => {
  const link = event.target.closest("a[href]");
  if (link) {
    if (link.getAttribute("href") === currentHash()) {
      event.preventDefault();
      scrollTo(0, 0);
    } else {
      nextScrollTarget = link.dataset.keepScroll ?? null;
    }
    return;
  }
  const button = event.target.closest("[data-do]");
  if (!button) return;
  if (button.dataset.do === "save-backup") saveBackup();
  if (button.dataset.do === "pick-backup") document.getElementById("backup-file").click();
  if (button.dataset.do === "cancel-restore") {
    pendingRestore = null;
    draw();
    scrollTo(0, 0);
  }
});

function afterSave() {
  // Asks the browser not to clear this site's data when space runs low. It may say no.
  if (!afterSave.asked) navigator.storage?.persist?.().catch(() => {});
  afterSave.asked = true;
}

document.addEventListener("submit", (event) => {
  const form = event.target.closest("form[data-action]");
  if (!form) return;
  event.preventDefault();

  if (form.dataset.action === "restore") {
    restoreBackup();
    return;
  }

  const fields = Object.fromEntries(new FormData(form));
  if (event.submitter?.name) fields[event.submitter.name] = event.submitter.value;
  try {
    const result = submit(store, form.dataset.action, fields, form.dataset.date);
    if (result.replaceWith) history.replaceState(history.state, "", result.replaceWith);
    draw(result.opts);
    scrollToTarget(result.scrollTo);
    if (result.toast) showToast(result.toast);
    afterSave();
  } catch (error) {
    console.error(error);
    showToast(FAILED_TO_SAVE);
  }
});

async function saveBackup() {
  const now = new Date();
  const name = `pip-steps-backup-${dayKey(today())}.json`;
  const file = new File([store.exportBackup(now)], name, { type: "application/json" });

  // Phones can hand the file straight to Files, Drive or email through the share sheet.
  let saved = false;
  if (matchMedia("(pointer: coarse)").matches && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file] });
      saved = true;
    } catch (error) {
      if (error.name === "AbortError") return; // they changed their mind
    }
  }
  if (!saved) {
    const url = URL.createObjectURL(file);
    const link = document.createElement("a");
    link.href = url;
    link.download = name;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  }
  try {
    store.noteBackup(now);
  } catch {
    // the backup itself still went out
  }
  draw();
  showToast("Backup saved. Keep it somewhere other than this device.");
}

document.addEventListener("change", async (event) => {
  if (event.target.id !== "backup-file") return;
  const file = event.target.files[0];
  if (!file) return;
  try {
    pendingRestore = parseBackup(await file.text());
    draw({ pending: pendingRestore });
  } catch (error) {
    pendingRestore = null;
    draw({ importError: error.message });
  }
  scrollTo(0, 0);
});

function restoreBackup() {
  if (!pendingRestore) return;
  try {
    store.restore(pendingRestore);
  } catch (error) {
    console.error(error);
    showToast(FAILED_TO_SAVE);
    return;
  }
  const { days } = pendingRestore;
  pendingRestore = null;
  afterSave();
  history.replaceState(history.state, "", "#/");
  draw();
  scrollTo(0, 0);
  showToast(`Backup restored, with ${days === 1 ? "1 day" : `${days} days`} of steps.`);
}

function showToast(message) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.hidden = false;
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => {
    toast.hidden = true;
  }, 5000);
}

// An installed app can stay open for days, so "Today" has to catch up when it comes back.
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible" && dayKey(today()) !== shownToday) draw();
});

// Another tab changed the data, so this one shouldn't keep showing the old steps.
addEventListener("storage", (event) => {
  if (event.key === STORE_KEY || event.key === null) draw();
});

adoptHistoryEntry();
draw();

if (!persistent) {
  showToast("Your browser is blocking storage, so your steps won't be kept after you close this.");
} else if (store.wasDamaged()) {
  showToast("Your saved steps couldn't be read, so the app started fresh. Restore a backup if you have one.");
}

if ("serviceWorker" in navigator) {
  addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch((error) => {
      console.warn("Offline support isn't available:", error);
    });
  });
}
