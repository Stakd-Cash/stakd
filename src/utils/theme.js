export function applyTheme(theme) {
  const html = document.documentElement;
  html.classList.add("thm");
  // force style flush so transitions fire
  getComputedStyle(html).backgroundColor;
  html.setAttribute("data-theme", theme);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", theme === "dark" ? "#1e1e1e" : "#f3f3f3");
}

