// The drawings. Colours that change at night are classes like fill-on-air, set in app.css.
import { html } from "./html.js";

// Walkers stand with their feet at (0,0), so they can sit on any path or bar. They
// share legs and shoes, so one walking animation fits them all.
export function walkerArt(key, mood) {
  if (mood === "asleep") return asleep(key);
  if (mood === "summit") return summit(key);
  return walking(key);
}

function asleep(key) {
  return html`
<g transform="translate(14 0)">
<g stroke="#14233B" stroke-linecap="round">
  <rect x="-30" y="-9" width="11" height="9" rx="4" fill="#FDF8E8" stroke-width="2"/>
  <path class="stroke-limb" d="M-24-3h8" stroke-width="3.5"/>
  ${key === "miso" ? html`
  <path d="M-20-16c-9-1-12-10-7-15" fill="none" stroke="#F4792B" stroke-width="5"/>
  <path d="M-2-23-2-37 9-27ZM10-27 20-36 19-20Z" fill="#F4792B" stroke="none"/>
  <path d="M-23-14c-3-20 38-24 44-5 3 12-2 19-14 19H-11C-20 0-22-6-23-14Z" fill="#F4792B" stroke="none"/>
  <path d="M-14-22v6M-8-25v6" fill="none" stroke="#B9481A" stroke-width="2.5"/>
  <path d="M-3-13c2 2 5 2 7 0M8-13c2 2 5 2 7 0" fill="none" stroke-width="2"/>
  <path d="M4.5-9h3l-1.5 2Z" fill="#FF5C8A" stroke="none"/>
  <path class="stroke-limb" d="M16-9 23-11M16-6 23-5" fill="none" stroke-width="1.25"/>
  ` : key === "nori" ? html`
  <path d="M-23-14c-3-20 38-24 44-5 3 12-2 19-14 19H-11C-20 0-22-6-23-14Z" fill="#3F5BD9" stroke="none"/>
  <ellipse cx="9" cy="-3" rx="10" ry="3" fill="#FDF8E8" stroke="none"/>
  <path d="M-9-22.5c5 6 6 15 3 22.5h6.5c3-8 1-17-3-23.5Z" fill="#FF5C8A" stroke="none"/>
  <path d="M0-13c2 2 5 2 7 0M10-13c2 2 5 2 7 0" fill="none" stroke="#FDF8E8" stroke-width="2"/>
  <path d="M4-9h6l-3 4.5Z" fill="#FFC93C" stroke="none"/>
  ` : html`
  <path d="M-23-14c-3-20 38-24 44-5 3 12-2 19-14 19H-11C-20 0-22-6-23-14Z" fill="#FF5C8A" stroke="none"/>
  <path d="M5-24c1-5-3-9-8-9 0 5 3 9 8 9Zm0 0c0-4 4-7 8-7 0 4-4 7-8 7Z" fill="#37A36B" stroke="none"/>
  <path d="M-3-13c2 2 5 2 7 0M8-13c2 2 5 2 7 0" fill="none" stroke-width="2"/>
  <path d="M4-6c1 1 3 1 4 0" fill="none" stroke-width="1.75"/>
  `}
</g>
<g class="fill-on-air font-display" font-weight="800">
  <text x="24" y="-38" font-size="11">z</text>
  <text x="31" y="-49" font-size="15">z</text>
  <text x="41" y="-63" font-size="20">Z</text>
</g>
</g>`;
}

function summit(key) {
  return html`
<g class="pip-hop" stroke="#14233B" stroke-linecap="round">
  <path class="stroke-limb" d="M-7-16-9-4M7-16 9-4" stroke-width="3.5"/>
  <rect x="-15" y="-6" width="12" height="6" rx="3" fill="#FDF8E8" stroke-width="2"/>
  <rect x="3" y="-6" width="12" height="6" rx="3" fill="#FDF8E8" stroke-width="2"/>
  ${key === "miso" ? html`
  <path d="M15-20c12 0 16-11 11-21" fill="none" stroke="#F4792B" stroke-width="5"/>
  <path class="stroke-limb" d="M-16-36-27-50M16-36 27-50" stroke-width="3.5"/>
  <path d="M-16-48-17-68-3-59ZM16-48 17-68 3-59Z" fill="#F4792B" stroke="none"/>
  <path d="M-18-26c-4-20 6-34 18-34s22 14 18 34c-2 10-34 10-36 0Z" fill="#F4792B" stroke="none"/>
  <path d="M-14.5-53-15-63-8-58ZM14.5-53 15-63 8-58Z" fill="#FFB48A" stroke="none"/>
  <path d="M-3-59v5M3-59v5" fill="none" stroke="#B9481A" stroke-width="2.5"/>
  ` : key === "nori" ? html`
  <path d="M-16-36-26-48M16-36 26-48" stroke="#3F5BD9" stroke-width="5"/>
  <path d="M-18-26c-4-20 6-34 18-34s22 14 18 34c-2 10-34 10-36 0Z" fill="#3F5BD9" stroke="none"/>
  <ellipse cx="0" cy="-22" rx="13" ry="11" fill="#FDF8E8" stroke="none"/>
  <path d="M-19-30c12 5 26 5 38 0v6c-12 5-26 5-38 0Z" fill="#FF5C8A" stroke="none"/>
  ` : html`
  <path class="stroke-limb" d="M-16-36-27-50M16-36 27-50" stroke-width="3.5"/>
  <path d="M-18-26c-4-20 6-34 18-34s22 14 18 34c-2 10-34 10-36 0Z" fill="#FF5C8A" stroke="none"/>
  <path d="M0-60c1-6-3-11-9-11 0 6 3 11 9 11Zm0 0c0-5 5-9 10-9 0 5-5 9-10 9Z" fill="#37A36B" stroke="none"/>
  `}
  <circle cx="-6" cy="-41" r="5.5" fill="#fff" stroke="none"/><circle cx="7" cy="-41" r="5.5" fill="#fff" stroke="none"/>
  <circle cx="-6" cy="-42" r="2.7" fill="#14233B" stroke="none"/><circle cx="7" cy="-42" r="2.7" fill="#14233B" stroke="none"/>
  ${key === "miso" ? html`
  <path d="M-1-35h3l-1.5 2Z" fill="#FF5C8A" stroke="none"/>
  <path d="M-5-32c2 6 9 6 11 0Z" fill="#14233B" stroke="none"/>
  <path class="stroke-limb" d="M-17-34-24-36M-17-31-24-30M18-34 25-36M18-31 25-30" fill="none" stroke-width="1.25"/>
  ` : key === "nori" ? html`
  <path d="M-6-36H7L.5-29Z" fill="#FFC93C" stroke="none"/>
  ` : html`
  <path d="M-6-31c2 8 11 8 13 0Z" fill="#14233B" stroke="none"/>
  `}
</g>`;
}

function walking(key) {
  return html`
<g stroke="#14233B" stroke-linecap="round">
  <g class="pip-leg pip-leg-back">
    <path class="stroke-limb" d="M-4-16-6-4" stroke-width="3.5"/>
    <rect x="-12" y="-6" width="12" height="6" rx="3" fill="#FDF8E8" stroke-width="2"/>
  </g>
  ${key === "miso" ? html`
  <path d="M-14-20c-12 0-16-11-11-21" fill="none" stroke="#F4792B" stroke-width="5"/>
  <path d="M-11-50-13-68 2-58ZM6-58 19-68 18-48Z" fill="#F4792B" stroke="none"/>
  <path d="M-17-24c-3-20 6-34 18-34s22 14 18 33c-2 12-34 12-36 1Z" fill="#F4792B" stroke="none"/>
  <path d="M-9.5-54-10.5-63-3-58ZM9-57 16.5-63 16-52Z" fill="#FFB48A" stroke="none"/>
  <path d="M-14-38h6M-15-30h7" fill="none" stroke="#B9481A" stroke-width="2.5"/>
  ` : key === "nori" ? html`
  <path d="M-17-24c-3-20 6-34 18-34s22 14 18 33c-2 12-34 12-36 1Z" fill="#3F5BD9" stroke="none"/>
  <ellipse cx="5" cy="-20" rx="12" ry="11" fill="#FDF8E8" stroke="none"/>
  ` : html`
  <path d="M-17-24c-3-20 6-34 18-34s22 14 18 33c-2 12-34 12-36 1Z" fill="#FF5C8A" stroke="none"/>
  `}
  <g class="pip-leg pip-leg-front">
    <path class="stroke-limb" d="M6-16 8-4" stroke-width="3.5"/>
    <rect x="2" y="-6" width="12" height="6" rx="3" fill="#FDF8E8" stroke-width="2"/>
  </g>
  <circle cx="1" cy="-41" r="5.5" fill="#fff" stroke="none"/><circle cx="13" cy="-40" r="5" fill="#fff" stroke="none"/>
  <circle cx="3" cy="-41" r="2.6" fill="#14233B" stroke="none"/><circle cx="15" cy="-40" r="2.5" fill="#14233B" stroke="none"/>
  ${key === "miso" ? html`
  <path d="M8-34h3L9.5-32Z" fill="#FF5C8A" stroke="none"/>
  <path d="M5-30c1.5 2 3.5 2 4.5-.5 1 2.5 3 2.5 4.5.5" fill="none" stroke-width="1.75"/>
  <path class="stroke-limb" d="M18-34 25-36M18-31 25-30" fill="none" stroke-width="1.25"/>
  <path class="stroke-limb" d="M-10-30-20-22" stroke-width="3.5"/>
  ` : key === "nori" ? html`
  <path d="M9-36 22-33 10-30Z" fill="#FFC93C" stroke="none"/>
  <path d="M-17-30c11 5 25 5 36 0v6c-11 5-25 5-36 0Z" fill="#FF5C8A" stroke="none"/>
  <path d="M-15-28-26-31-25-23-15-22Z" fill="#FF5C8A" stroke="none"/>
  <path d="M-14-20-22-12" stroke="#3F5BD9" stroke-width="5"/>
  ` : html`
  <path d="M1-58c1-6-3-11-9-11 0 6 3 11 9 11Zm0 0c0-5 5-9 10-9 0 5-5 9-10 9Z" fill="#37A36B" stroke="none"/>
  <path d="M4-31c2 3 7 3 9 0" fill="none" stroke-width="2"/>
  <path class="stroke-limb" d="M-10-30-20-22" stroke-width="3.5"/>
  `}
</g>`;
}

// Stars fade in at night. They run well past the picture so wide screens get them too.
export const stars = html`
<g class="scene-stars" fill="#FDF8E8" aria-hidden="true">
  <circle cx="-640" cy="60" r="1.5"/><circle cx="-560" cy="112" r="1"/><circle cx="-470" cy="34" r="1.5"/>
  <circle cx="-390" cy="96" r="1"/><circle cx="-300" cy="22" r="1.5"/><circle cx="-220" cy="130" r="1"/>
  <circle cx="-140" cy="58" r="1.5"/><circle cx="-60" cy="118" r="1"/><circle cx="238" cy="72" r="1.5"/>
  <circle cx="218" cy="12" r="1"/><circle cx="262" cy="116" r="1"/><circle cx="392" cy="20" r="1"/>
  <circle cx="290" cy="30" r="1.5"/><circle cx="470" cy="70" r="1.5"/><circle cx="560" cy="26" r="1"/>
  <circle cx="640" cy="104" r="1.5"/><circle cx="730" cy="48" r="1"/><circle cx="820" cy="120" r="1.5"/>
  <circle cx="910" cy="30" r="1"/><circle cx="1000" cy="84" r="1.5"/>
  <circle cx="240" cy="-14" r="1"/><circle cx="-120" cy="-24" r="1.5"/><circle cx="510" cy="-28" r="1"/>
  <path d="M262 58c1 4 2 5 6 6-4 1-5 2-6 6-1-4-2-5-6-6 4-1 5-2 6-6ZM-250 64c1 4 2 5 6 6-4 1-5 2-6 6-1-4-2-5-6-6 4-1 5-2 6-6ZM600 56c1 4 2 5 6 6-4 1-5 2-6 6-1-4-2-5-6-6 4-1 5-2 6-6Z"/>
</g>`;

// Small pictures for the settings rows on the Day screen.
export function rowArt(kind) {
  const pictures = {
    goal: html`
  <circle class="day-only" cx="36" cy="16" r="9" fill="#FFC93C"/>
  <circle class="night-only" cx="36" cy="16" r="9" fill="#F3EDC8"/>
  <path class="fill-hill-near" d="M0 48V38c8-8 16-15 24-15s16 7 24 15v10Z"/>
  <path class="stroke-on-air" d="M24 24V7" stroke-width="2.5" stroke-linecap="round"/>
  <path d="M25 7 37 11.5 25 16Z" fill="#FF5C8A" stroke="#14233B" stroke-width="1.5" stroke-linejoin="round"/>`,
    backup: html`
  <path d="M9 24h30a2 2 0 0 1 2 2v12a3 3 0 0 1-3 3H10a3 3 0 0 1-3-3V26a2 2 0 0 1 2-2Z" fill="#FFC93C" stroke="#14233B" stroke-width="2" stroke-linejoin="round"/>
  <path d="M16 32h16" stroke="#14233B" stroke-width="2.5" stroke-linecap="round"/>
  <path class="stroke-on-air" d="M24 6v15M17 15l7 7 7-7" fill="none" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`,
    clear: html`
  <path class="stroke-on-air" d="M38 5 26 22" stroke-width="3.5" stroke-linecap="round"/>
  <path d="M21 19 31 26 25 42C19 42 11 38 8 33Z" fill="#FFC93C" stroke="#14233B" stroke-width="2" stroke-linejoin="round"/>
  <path d="M21 19 31 26 29 30 18 23Z" fill="#FF5C8A" stroke="#14233B" stroke-width="2" stroke-linejoin="round"/>
  <circle cx="17" cy="30" r="2.5" fill="#fff"/><circle cx="24" cy="33" r="2.5" fill="#fff"/>
  <circle cx="17.5" cy="30" r="1.2" fill="#14233B"/><circle cx="24.5" cy="33" r="1.2" fill="#14233B"/>
  <path d="M18 35c1 2 3 3 4 2.5" fill="none" stroke="#14233B" stroke-width="1.5" stroke-linecap="round"/>
  <circle cx="35" cy="40" r="3.5" fill="#FDF8E8"/><circle cx="41" cy="36" r="2.5" fill="#FDF8E8"/><circle cx="40" cy="43" r="1.8" fill="#FDF8E8"/>`,
  };
  return html`
<svg viewBox="0 0 48 48" class="size-12 shrink-0 rounded-xl bg-air" aria-hidden="true">${pictures[kind]}
</svg>`;
}

// Landmarks are drawn in a 100 by 120 box with the ground along the bottom edge.
const LANDMARK_ART = {
  eiffel: html`
<g class="fill-on-air">
  <path d="M49 0h2l2 22h-6Z"/>
  <path d="M46 20h8c2 26 6 44 12 54H34c6-10 10-28 12-54Z"/>
  <path d="M30 72h40v6H30Z"/>
  <path d="M33 78h34c4 16 11 30 21 42H70c-3-14-10-22-20-22s-17 8-20 22H12c10-12 17-26 21-42Z"/>
  <path d="M22 96h56v5H22Z"/>
</g>
<path d="M45 30 55 44M55 30 45 44M43 46 57 60M57 46 43 60M40 62 60 72M60 62 40 72" class="stroke-air" stroke-width="1.5"/>`,
  everest: html`
<path d="M0 120 38 44l10 14 18-44 34 106Z" class="fill-mountain"/>
<path d="M66 14 48 58l9-6 7 9 7-10 9 11 2-8Z" fill="#FDF8E8"/>
<path class="stroke-on-air" d="M66 14V0" stroke-width="2.5" stroke-linecap="round"/>
<path d="M67 0 80 5 67 10Z" fill="#FF5C8A"/>`,
  medal: html`
<path d="M26 0h16l18 52H46Z" fill="#FF5C8A"/>
<path class="fill-on-air" d="M74 0H58L40 52h14Z"/>
<circle cx="50" cy="82" r="34" fill="#FFC93C" stroke="#14233B" stroke-width="3"/>
<circle cx="50" cy="82" r="25" fill="none" stroke="#14233B" stroke-width="1.5"/>
<text x="50" y="92" text-anchor="middle" class="font-display" font-size="28" font-weight="800" fill="#14233B">42</text>`,
  canyon: html`
<path d="M0 120V28h22l3 20h12l4 28h8l1 44Z" fill="#C8552B"/>
<path d="M100 120V38H82l-3 18H68l-4 26h-7l-2 38Z" fill="#E98A3C"/>
<path d="M0 62h33M0 90h44M100 66H70M100 96H60" stroke="#14233B" stroke-opacity=".35" stroke-width="2"/>
<path d="M50 120V100h6v20Z" fill="#1F7FC4"/>`,
  route66: html`
<path class="fill-on-air" d="M47 66h6v54h-6Z"/>
<path d="M50 6c9 5 19 5 28 0 7 10 9 21 5 32C78 56 62 64 50 72 38 64 22 56 17 38 13 27 15 16 22 6c9 5 19 5 28 0Z" fill="#FDF8E8" stroke="#14233B" stroke-width="3" stroke-linejoin="round"/>
<text x="50" y="27" text-anchor="middle" class="font-display" font-size="11" font-weight="800" fill="#14233B">ROUTE</text>
<text x="50" y="56" text-anchor="middle" class="font-display" font-size="30" font-weight="800" fill="#14233B">66</text>`,
  bridge: html`
<path d="M0 104h100v16H0Z" fill="#1F7FC4"/>
<path d="M0 44C10 40 20 32 28 18 36 50 64 50 72 18 80 32 90 40 100 44M38 38v42M50 44v36M62 38v42M12 38v42M88 38v42" fill="none" stroke="#E4572E" stroke-width="2"/>
<path d="M24 12h8v108h-8ZM68 12h8v108h-8Z" fill="#E4572E"/>
<path d="M22 24h12v4H22ZM66 24h12v4H66ZM22 44h12v4H22ZM66 44h12v4H66Z" fill="#E4572E"/>
<path d="M0 78h100v6H0Z" fill="#E4572E"/>`,
  burj: html`
<g class="fill-on-air">
  <path d="M49 0h2l1.5 26h-5Z"/>
  <path d="M46 24h8l1.5 22h-11Z"/>
  <path d="M43 44h14l2 24H41Z"/>
  <path d="M39 66h22l3 26H36Z"/>
  <path d="M34 90h32l5 30H29Z"/>
</g>
<path d="M50 28v90M44 70v48M56 70v48" class="stroke-air" stroke-width="1.5"/>`,
  pitch: html`
<rect x="12" y="4" width="76" height="116" rx="4" fill="#37A36B"/>
<g fill="none" stroke="#FDF8E8" stroke-width="2.5">
  <rect x="18" y="10" width="64" height="104"/>
  <path d="M18 62h64M34 10v18h32V10M34 114V96h32v18"/>
  <circle cx="50" cy="62" r="11"/>
</g>`,
  pool: html`
<path d="M26 34h48l20 86H6Z" fill="#1F7FC4"/>
<path d="M38 34 27 120M50 34v86M62 34l11 86" stroke="#FDF8E8" stroke-width="2.5" stroke-dasharray="5 5"/>
<path d="M26 34h48l20 86H6Z" fill="none" stroke="#FDF8E8" stroke-width="3" stroke-linejoin="round"/>
<path d="M24 26h12v8H24ZM44 26h12v8H44ZM64 26h12v8H64Z" fill="#FF5C8A" stroke="#14233B" stroke-width="1.5"/>`,
};

export const landmark = (art) => LANDMARK_ART[art];

export function chevron(direction) {
  return html`
<svg viewBox="0 0 24 24" class="size-7" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  ${direction === "prev" ? html`<path d="m15 5-7 7 7 7"/>` : html`<path d="m9 5 7 7-7 7"/>`}
</svg>`;
}

const TAB_ICONS = {
  day: html`
  <circle cx="12" cy="12" r="5"/>
  <path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>`,
  month: html`
  <path fill-rule="evenodd" d="M6 3h2v2h8V3h2v2h1a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h1V3Zm-1 7v9h14v-9H5Zm2 2h3v3H7v-3Z"/>`,
  year: html`
  <path d="M2 20 9 7l4 6 2-3 7 10H2Z"/>`,
};

export function tabIcon(icon) {
  return html`
<svg viewBox="0 0 24 24" class="size-6" fill="currentColor" aria-hidden="true">${TAB_ICONS[icon]}
</svg>`;
}

export const shortHills = html`
${stars}
<path d="M-30 74c0-7 6-11 12-9 3-6 13-7 17 0 6-2 11 3 11 9Z" class="fill-cloud" transform="translate(330 -8)"/>
<path d="M-2000 196H0c60 0 90-22 160-22s120 26 190 26 130-14 240-8H3000V233H-2000Z" class="fill-hill-far"/>
<path d="M-2000 218H0c70 0 130-16 220-12s140 10 240 6 140 4 240 4H3000V233H-2000Z" class="fill-hill-near"/>`;

export const shortSoil = html`
<path d="M-2000 228H0c60 0 110-6 170-4s130 8 230 4 170 2 300 2H3000V400H-2000Z" class="fill-soil"/>`;
