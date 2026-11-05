// Set the theme before the page paints, so night mode never flashes white first.
// This loads as a plain script because modules wait until the page has been read.
(function () {
  var THEME_KEY = "pip-steps:theme";
  var THEME_COLORS = { day: "#7FD1E8", night: "#16204A" };

  function savedTheme() {
    try {
      return localStorage.getItem(THEME_KEY);
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

  var theme = savedTheme();
  if (theme !== "day" && theme !== "night") {
    theme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "night" : "day";
  }
  document.documentElement.setAttribute("data-theme", theme);
  syncThemeControls();

  document.addEventListener("DOMContentLoaded", syncThemeControls);

  document.addEventListener("click", function (event) {
    if (!event.target.closest("#theme-toggle")) return;
    var next = currentTheme() === "night" ? "day" : "night";
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch (error) {
      // the switch still works for this visit
    }
    syncThemeControls();
  });
})();
