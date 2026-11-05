// A small HTML template tag. Values are escaped unless they came from html`` or raw(),
// so text someone typed can never turn into markup when it's shown back to them.
class Safe {
  constructor(text) {
    this.text = text;
  }
  toString() {
    return this.text;
  }
}

const ENTITIES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

function escapeText(value) {
  return String(value).replace(/[&<>"']/g, (c) => ENTITIES[c]);
}

function part(value) {
  if (value === null || value === undefined || value === false || value === true) return "";
  if (value instanceof Safe) return value.text;
  if (Array.isArray(value)) return value.map(part).join("");
  return escapeText(value);
}

export function html(strings, ...values) {
  let out = strings[0];
  values.forEach((value, i) => {
    out += part(value) + strings[i + 1];
  });
  return new Safe(out);
}
