// Set the theme before the page paints, so night mode never flashes white first.
var THEME_COLORS = { day: "#7FD1E8", night: "#16204A" };

function savedTheme() {
  try {
    return localStorage.getItem("theme");
  } catch (error) {
    return null; // storage can be blocked, for example in private browsing
  }
}

function currentTheme() {
  return document.documentElement.getAttribute("data-theme");
}

function syncThemeControls() {
  var toggle = document.getElementById("theme-toggle");
  if (toggle) toggle.setAttribute("aria-checked", currentTheme() === "night" ? "true" : "false");
  var meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", THEME_COLORS[currentTheme()]);
}

(function () {
  var theme = savedTheme();
  if (theme !== "day" && theme !== "night") {
    theme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "night" : "day";
  }
  document.documentElement.setAttribute("data-theme", theme);
  syncThemeControls();
})();

document.addEventListener("DOMContentLoaded", syncThemeControls);
// Going back replaces the page, including the switch, so it needs its state again.
document.addEventListener("htmx:historyRestore", syncThemeControls);

document.addEventListener("click", function (event) {
  if (!event.target.closest("#theme-toggle")) return;
  var theme = currentTheme() === "night" ? "day" : "night";
  document.documentElement.setAttribute("data-theme", theme);
  try {
    localStorage.setItem("theme", theme);
  } catch (error) {
    // the switch still works for this visit
  }
  syncThemeControls();
});

// Tell the server the visitor's time zone, so "today" rolls over at their midnight.
var reloading = (function () {
  var tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  if (!tz) return false;
  var cookie = "tz=" + encodeURIComponent(tz);
  if (document.cookie.split("; ").indexOf(cookie) !== -1) return false;
  document.cookie = cookie + "; path=/; max-age=31536000; samesite=lax";
  // Reload only if the cookie stuck, otherwise blocked cookies would loop forever.
  if (document.cookie.split("; ").indexOf(cookie) === -1) return false;
  location.reload();
  return true;
})();

// Registering during that reload would be cancelled, so wait for the next load.
if (!reloading && "serviceWorker" in navigator) {
  window.addEventListener("load", function () {
    navigator.serviceWorker.register("/sw.js").catch(function (error) {
      console.warn("Offline support isn't available:", error);
    });
  });
}

function showToast(message) {
  var toast = document.getElementById("toast");
  toast.textContent = message;
  toast.hidden = false;
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(function () { toast.hidden = true; }, 5000);
}

document.addEventListener("htmx:sendError", function (event) {
  var saving = event.detail.requestConfig.verb !== "get";
  showToast(saving
    ? "You're offline, so this didn't go through. Try again when you're connected."
    : "You're offline and this screen hasn't been saved on this device yet.");
});

// The service worker keeps copies of screens for offline use, and those show the old steps.
document.addEventListener("dataCleared", function () {
  showToast("All data cleared.");
  if (!("caches" in window)) return;
  caches.keys().then(function (keys) {
    keys.forEach(function (key) {
      if (key.indexOf("pages-") === 0) caches.delete(key);
    });
  });
});

document.addEventListener("htmx:responseError", function (event) {
  showToast(event.detail.xhr.responseText || "That didn't work. Try again.");
});
