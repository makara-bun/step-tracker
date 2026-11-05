// The HTML for each screen. Each function takes a view from views.js or pages.js.
import { chevron, landmark, rowArt, shortHills, shortSoil, stars, tabIcon, walkerArt } from "./art.js";
import { html } from "./html.js";
import { commas, plural } from "./views.js";

// The bottom tabs are part of every screen.
export function nav(tabs) {
  return html`
<nav aria-label="Views" class="fixed inset-x-0 bottom-0 z-20 bg-ink pb-[env(safe-area-inset-bottom)]">
  <ul class="mx-auto grid max-w-xl grid-cols-3">
    ${tabs.map((t) => html`
    <li>
      <a href="${t.href}" ${t.active ? html`aria-current="page"` : ""}
         class="flex min-h-15 flex-col items-center justify-center gap-0.5 text-sm ${t.active ? "font-bold text-sun" : "text-cream"}">
        ${tabIcon(t.icon)}
        ${t.label}
      </a>
    </li>`)}
  </ul>
</nav>`;
}

export function dayScreen(v) {
  const label = v.isToday ? "Your steps today" : `Your steps on ${v.heading}`;
  return html`
<section class="on-sky relative overflow-hidden text-on-air">
  <div class="relative mx-auto max-w-xl pt-12">
    ${scene(v)}
    <div class="absolute inset-x-0 top-0 px-3 pt-2 sm:px-4">
      <div class="flex items-center gap-1">
        <a href="${v.prevHref}" aria-label="Previous day" class="grid size-11 place-items-center rounded-full">${chevron("prev")}</a>
        <h1 class="min-w-20 text-center font-display text-xl font-bold">${v.heading}</h1>
        ${v.nextHref ? html`<a href="${v.nextHref}" aria-label="Next day" class="grid size-11 place-items-center rounded-full">${chevron("next")}</a>` : ""}
      </div>
      <div class="px-2">
        <p class="font-display text-[4rem] leading-none font-extrabold sm:text-8xl">${commas(v.steps)}</p>
        <p id="status" aria-live="polite" class="mt-1 max-w-52 text-lg leading-snug font-bold sm:max-w-72">${v.status}</p>
      </div>
    </div>
  </div>
</section>

<section class="mx-auto max-w-xl px-4 pt-3 pb-28">
  <form data-action="steps" data-date="${v.date}">
    <label for="steps" class="font-display text-lg font-bold">${label}</label>
    <div class="mt-1.5 flex gap-2">
      <input id="steps" name="steps" type="text" inputmode="numeric" autocomplete="off" placeholder="0" value="${v.input}"
             ${v.error ? html`aria-invalid="true" aria-describedby="steps-error"` : ""}
             class="min-h-13 w-full min-w-0 flex-1 rounded-xl bg-cream px-4 font-display text-2xl font-bold text-ink placeholder:text-ink/50">
      <button class="min-h-13 shrink-0 cursor-pointer rounded-xl bg-sun px-5 font-display text-lg font-bold text-ink">Save steps</button>
    </div>
    ${v.error ? html`<p id="steps-error" role="alert" class="mt-2 font-bold text-sun">${v.error}</p>` : ""}
  </form>

  <form data-action="add" data-date="${v.date}" class="mt-3 flex flex-wrap gap-2">
    ${v.quickAdds.map((n) => html`
    <button name="steps" value="${n}" class="min-h-11 flex-1 cursor-pointer rounded-full border-2 border-meadow px-3 font-display font-bold whitespace-nowrap text-cream">Add ${commas(n)}</button>`)}
  </form>

  ${v.steps ? html`
  <div class="mt-6 flex items-center gap-4">
    ${v.compare ? html`<span class="shrink-0 rounded-2xl bg-air p-2"><svg viewBox="0 0 100 120" class="block h-20 w-16" aria-hidden="true">${landmark(v.compare.art)}</svg></span>` : ""}
    <div class="min-w-0">
      <p class="text-lg leading-snug">${v.distance}.${v.compare ? html` That's ${v.compare.text}.` : ""}</p>
      ${v.moreFacts.length ? html`<ul class="mt-2 space-y-1 leading-snug">${v.moreFacts.map((f) => html`<li>Or ${f.text}.</li>`)}</ul>` : ""}
    </div>
  </div>` : ""}

  <form data-action="walker" data-date="${v.date}" class="mt-6">
    <h2 id="walker-heading" class="font-display text-lg font-bold">Who's walking?</h2>
    <div role="group" aria-labelledby="walker-heading" class="mt-2 grid grid-cols-3 gap-3">
      ${v.walkers.map((w) => {
        const picked = w.key === v.walker.key;
        return html`
      <button name="walker" value="${w.key}" aria-pressed="${picked ? "true" : "false"}" class="cursor-pointer rounded-2xl">
        <span class="block rounded-2xl bg-air py-2 ${picked ? "ring-3 ring-sun ring-offset-2 ring-offset-soil" : ""}">
          <svg viewBox="-32 -72 62 74" class="mx-auto block h-20 w-full" aria-hidden="true">${walkerArt(w.key, "walking")}</svg>
        </span>
        <span class="mt-1.5 flex items-center justify-center gap-1 font-display font-bold">
          ${picked ? html`<svg viewBox="0 0 24 24" class="size-4 text-sun" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m4 13 5 5L20 6"/></svg>` : ""}
          ${w.name}
        </span>
      </button>`;
      })}
    </div>
  </form>

  <details id="goal-row" class="group mt-6 scroll-mt-4 rounded-2xl border-2 border-meadow" ${v.goalError ? html`open` : ""}>
    <summary class="flex cursor-pointer list-none items-center gap-3 rounded-2xl p-2 pr-3 [&::-webkit-details-marker]:hidden">
      ${rowArt("goal")}
      <span class="min-w-0 flex-1">
        <span class="block font-display text-lg leading-tight font-bold">Change your goal</span>
        <span class="block text-sm">${commas(v.goal)} steps a day</span>
      </span>
      <svg viewBox="0 0 24 24" class="size-6 shrink-0 motion-safe:transition-transform group-open:rotate-180" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 9 7 7 7-7"/></svg>
    </summary>
    <form data-action="goal" data-date="${v.date}" class="px-2 pb-2">
      <label for="goal" class="sr-only">Daily goal in steps</label>
      <div class="flex gap-2">
        <input id="goal" name="goal" type="text" inputmode="numeric" autocomplete="off" value="${v.goal}"
               ${v.goalError ? html`aria-invalid="true" aria-describedby="goal-error"` : ""}
               class="min-h-11 w-full min-w-0 flex-1 rounded-xl bg-cream px-4 font-bold text-ink">
        <button class="min-h-11 shrink-0 cursor-pointer rounded-xl border-2 border-meadow px-4 font-bold">Save goal</button>
      </div>
      ${v.goalError ? html`<p id="goal-error" role="alert" class="mt-2 font-bold text-sun">${v.goalError}</p>` : ""}
    </form>
  </details>

  ${settingsRow("#/backup", "backup", "Back up your steps", "They're only saved on this device")}
  ${settingsRow("#/clear", "clear", "Clear all data", "You'll confirm first")}
</section>`;
}

function settingsRow(href, art, title, detail) {
  return html`
  <a href="${href}" class="mt-3 flex items-center gap-3 rounded-2xl border-2 border-meadow p-2 pr-3">
    ${rowArt(art)}
    <span class="min-w-0 flex-1">
      <span class="block font-display text-lg leading-tight font-bold">${title}</span>
      <span class="block text-sm">${detail}</span>
    </span>
    <svg viewBox="0 0 24 24" class="size-6 shrink-0" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 5 7 7-7 7"/></svg>
  </a>`;
}

function scene(v) {
  return html`
<svg viewBox="0 0 400 300" class="-mb-px block w-full overflow-visible" role="img"
     aria-label="${v.walker.name} is ${v.pct}% of the way up the hill to the goal flag.">
  ${stars}
  <g class="scene-moon">
    <circle cx="322" cy="92" r="58" fill="#FDF8E8" fill-opacity=".1"/>
    <circle cx="322" cy="92" r="42" fill="#F3EDC8"/>
    <circle cx="308" cy="78" r="7" fill="#DCD5AC"/><circle cx="334" cy="104" r="9" fill="#DCD5AC"/><circle cx="337" cy="74" r="4" fill="#DCD5AC"/><circle cx="305" cy="108" r="3.5" fill="#DCD5AC"/>
  </g>
  <g class="scene-sun">
    <circle cx="322" cy="92" r="66" fill="#FFE08A"/>
    <circle cx="322" cy="92" r="48" fill="#FFC93C"/>
  </g>
  <path d="M238 58c0-8 7-13 14-11 3-7 16-8 20 0 8-2 13 3 13 11Z" class="fill-cloud" transform="translate(-16 -73)"/>
  <path class="fill-cloud" d="M-60 40c0-7 6-11 12-9 3-6 13-7 17 0 6-2 11 3 11 9Z"/>

  <path d="M-2000 210H-40C40 210 70 170 130 170s90 40 150 40 90-70 170-70 130 60 240 60H3000V296H-2000Z" class="fill-hill-far"/>
  <g class="fill-hill-near">
    <circle cx="20" cy="192" r="11"/><rect class="fill-trunk" x="18" y="198" width="4" height="14"/>
    <circle cx="42" cy="186" r="8"/><rect class="fill-trunk" x="40" y="191" width="4" height="10"/>
  </g>

  <path d="M-2000 275H-100C-50 275 0 270 30 268 120 262 170 240 220 190s80-65 125-78c27-8 55 18 95 58s120 100 260 110H3000V296H-2000Z" class="fill-hill-near"/>
  <g fill="#FDF8E8" stroke="#14233B" stroke-width="1.5" transform="translate(92 279)">
    <circle cx="0" cy="-6" r="9"/><circle cx="-7" cy="-4" r="6"/><circle cx="7" cy="-4" r="6"/>
    <rect x="8" y="-11" width="10" height="9" rx="4" fill="#14233B"/>
    <path d="M-4 2v6M4 2v6" stroke-linecap="round"/>
  </g>

  <path d="M30 268C120 262 170 240 220 190s80-65 125-78" fill="none" stroke="#FDF8E8" stroke-opacity=".55" stroke-width="3" stroke-dasharray="2 9" stroke-linecap="round"/>
  <path id="trail" class="pip-trail" pathLength="100" d="M30 268C120 262 170 240 220 190s80-65 125-78" fill="none" stroke="#FFC93C" stroke-width="6" stroke-linecap="round"
        style="stroke-dasharray:${v.pct} 100"/>

  <g transform="translate(362 110)">
    <path class="stroke-on-air" d="M0 2V-58" stroke-width="4" stroke-linecap="round"/>
    <path d="M2-58 34-46 2-34Z" fill="#FF5C8A" stroke="#14233B" stroke-width="2" stroke-linejoin="round"/>
    ${v.celebrate ? html`
    <g class="confetti" aria-hidden="true">
      ${v.confetti.map((c) => html`<rect x="-3" y="-3" width="6" height="6" rx="1" fill="${c.color}" style="--x:${c.x}px;--y:${c.y}px;animation-delay:${c.delay}ms"/>`)}
    </g>` : ""}
  </g>

  <g id="pip" class="pip-walker ${v.animate ? "is-walking" : ""}" style="offset-distance:${v.pct}%">
    ${walkerArt(v.walker.key, v.mood)}
  </g>

  <path d="M-2000 292H0c50 0 90-7 150-5s110 8 170 3 120 2 200 2H3000V400H-2000Z" class="fill-soil"/>
</svg>`;
}

export function periodScreen(v) {
  return html`
<section class="on-sky relative overflow-hidden text-on-air">
  <div class="relative mx-auto max-w-xl">
    <svg viewBox="0 0 400 236" class="-mb-px block w-full overflow-visible" aria-hidden="true">
      ${shortHills}
      ${v.compare ? html`
      <g transform="translate(278 90)">${landmark(v.compare.art)}</g>
      ${v.compare.count > 1 ? html`<text x="272" y="118" text-anchor="end" class="fill-on-air font-display" font-size="24" font-weight="800">× ${commas(v.compare.count)}</text>` : ""}
      ` : v.total ? html`
      <g transform="translate(330 212)">${walkerArt(v.walker.key, "walking")}</g>
      ` : html`
      <g transform="translate(320 212)">${walkerArt(v.walker.key, "asleep")}</g>
      `}
      ${shortSoil}
    </svg>
    <div class="absolute inset-x-0 top-0 px-3 pt-2 sm:px-4">
      <div class="flex items-center gap-1">
        <a href="${v.prevHref}" aria-label="Previous ${v.kind}" class="grid size-11 place-items-center rounded-full max-[359px]:size-10">${chevron("prev")}</a>
        <h1 class="min-w-20 text-center font-display text-xl font-bold max-[359px]:text-base">${v.title}</h1>
        ${v.nextHref ? html`<a href="${v.nextHref}" aria-label="Next ${v.kind}" class="grid size-11 place-items-center rounded-full max-[359px]:size-10">${chevron("next")}</a>` : ""}
      </div>
      <div class="px-2">
        <p class="font-display text-[length:clamp(2.25rem,12.3vw,3rem)] leading-none font-extrabold sm:text-7xl">${commas(v.total)}</p>
        <p class="mt-1 text-lg font-bold">steps</p>
        ${v.distance ? html`<p class="max-w-44 leading-snug sm:max-w-64">${v.distance}</p>` : ""}
      </div>
    </div>
  </div>
</section>

<section class="mx-auto max-w-xl px-4 pt-3 pb-28">
  ${v.emptyText ? html`
  <p class="text-lg">${v.emptyText}</p>
  <a href="${v.todayHref}" class="mt-3 inline-flex min-h-11 items-center rounded-xl bg-sun px-5 font-display text-lg font-bold text-ink">Log today's steps</a>
  ` : v.compare ? html`<p class="text-lg leading-snug">That's ${v.compare.text}.</p>` : ""}
  ${v.calendar ? calendar(v) : ""}
  ${v.emptyText ? "" : html`
  ${chart(v.chart)}
  <ul class="mt-5 space-y-1 leading-snug">
    ${v.summary.map((line) => html`<li>${line}</li>`)}
  </ul>
  <details class="mt-5">
    <summary class="flex min-h-11 cursor-pointer items-center underline underline-offset-4">Show every ${v.kind === "month" ? "day" : "month"} as a table</summary>
    <table class="mt-2 w-full border-collapse">
      <thead>
        <tr class="border-b border-moss text-left">
          <th scope="col" class="py-2 font-bold">${v.tableLabel}</th>
          <th scope="col" class="py-2 text-right font-bold">Steps</th>
        </tr>
      </thead>
      <tbody>
        ${v.chart.bars.filter((b) => !b.future).map((b) => html`
        <tr class="border-b border-moss/60">
          <td class="py-0"><a href="${b.href}" class="flex min-h-11 items-center underline underline-offset-4">${b.name}</a></td>
          <td class="py-0 text-right tabular-nums">${commas(b.value)}</td>
        </tr>`)}
      </tbody>
    </table>
  </details>
  `}
</section>`;
}

function calendar(v) {
  // data-keep-scroll keeps the calendar in view, because changing screens scrolls to the top.
  // An empty slot stands in for the next arrow, so the previous arrow doesn't move under your finger.
  // An empty month has no chart below it, so without the extra height the page is too short
  // to scroll the heading to the top, and the arrows would move between months.
  return html`
<section class="mt-5 ${v.emptyText ? "min-h-dvh" : ""}" aria-labelledby="calendar-heading">
  <div class="flex items-center justify-between gap-2">
    <h2 id="calendar-heading" class="scroll-mt-4 font-display text-lg font-bold">Your calendar</h2>
    <div class="flex items-center">
      <a href="${v.prevHref}" data-keep-scroll="#calendar-heading" aria-label="Previous month" class="grid size-11 place-items-center rounded-full">${chevron("prev")}</a>
      <span class="min-w-20 text-center font-display font-bold">${v.calendarLabel}</span>
      ${v.nextHref ? html`<a href="${v.nextHref}" data-keep-scroll="#calendar-heading" aria-label="Next month" class="grid size-11 place-items-center rounded-full">${chevron("next")}</a>` : html`<span class="size-11" aria-hidden="true"></span>`}
    </div>
  </div>
  <ul class="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm">
    <li class="flex items-center gap-1.5"><span class="size-3 rounded-sm bg-sun"></span>Goal reached</li>
    <li class="flex items-center gap-1.5"><span class="size-3 rounded-sm bg-meadow"></span>Under goal</li>
  </ul>
  <div class="mt-3 grid grid-cols-7 gap-1 text-center text-xs" aria-hidden="true">
    <span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span>
  </div>
  <ol class="mt-1 grid grid-cols-7 gap-1">
    ${v.calendar.map((d) => html`
    <li ${d.start ? html`style="grid-column-start:${d.start}"` : ""}>
      ${d.future ? html`
      <span class="flex h-14 flex-col items-start rounded-lg p-1 text-xs font-bold opacity-50" aria-label="${d.label}">${d.day}</span>
      ` : html`
      <a href="${d.href}" aria-label="${d.label}" ${d.today ? html`aria-current="date"` : ""}
         class="relative flex h-14 flex-col justify-between rounded-lg p-1 text-left
           ${d.reached ? "bg-sun text-ink" : d.steps ? "bg-meadow text-ink" : "border border-moss"}
           ${d.today ? "ring-2 ring-cream ring-offset-2 ring-offset-soil" : ""}">
        <span class="text-xs leading-none font-bold">${d.day}</span>
        ${d.reached ? html`
        <svg viewBox="0 0 12 12" class="absolute top-1 right-1 size-3" aria-hidden="true">
          <path d="M3 11.5V1" stroke="#14233B" stroke-width="1.5" stroke-linecap="round"/>
          <path d="M3.5 1 10 3.5 3.5 6Z" fill="#FF5C8A" stroke="#14233B" stroke-width="1" stroke-linejoin="round"/>
        </svg>` : ""}
        ${d.steps ? html`<span class="block text-center font-display text-[0.8rem] leading-none font-bold whitespace-nowrap max-[359px]:text-[0.7rem]">${d.steps}</span>` : ""}
      </a>
      `}
    </li>`)}
  </ol>
</section>`;
}

function chart(c) {
  const alignClass = { left: "left-0", right: "right-0", center: "left-1/2 -translate-x-1/2" };
  return html`
<figure class="mt-5">
  <figcaption class="font-display text-lg font-bold">${c.caption}</figcaption>
  ${c.hasGoal ? html`
  <ul class="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm">
    <li class="flex items-center gap-1.5"><span class="size-3 rounded-sm bg-sun"></span>Goal reached</li>
    <li class="flex items-center gap-1.5"><span class="size-3 rounded-sm bg-meadow"></span>Under goal</li>
    <li class="flex items-center gap-1.5"><span class="h-px w-4 bg-cream"></span>${c.goalLabel}</li>
  </ul>` : ""}

  <div class="mt-3 grid grid-cols-[auto_minmax(0,1fr)] gap-x-2 pt-12">
    <div class="relative h-48 w-9 text-right text-xs tabular-nums" aria-hidden="true">
      ${c.ticks.map((t) => html`<span class="absolute right-0 translate-y-1/2" style="bottom:${t.pct}%">${t.label}</span>`)}
    </div>

    <div class="relative h-48">
      ${c.ticks.map((t) => html`<span class="absolute inset-x-0 h-px bg-moss" style="bottom:${t.pct}%" aria-hidden="true"></span>`)}
      ${c.hasGoal ? html`<span class="absolute inset-x-0 z-[1] h-px bg-cream" style="bottom:${c.goalPct}%" aria-hidden="true"></span>` : ""}
      <ol class="relative flex h-full gap-0.5">
        ${c.bars.map((b) => html`
        <li class="relative h-full min-w-0 flex-1">
          ${b.future ? "" : html`
          <a href="${b.href}" aria-label="${b.name}: ${commas(b.value)} steps" class="group absolute inset-0 flex items-end justify-center">
            <span class="w-full max-w-6 rounded-t-[4px] ${b.metGoal ? "bg-sun" : "bg-meadow"}" style="height:${b.pct}%"></span>
            ${b.best ? html`
            <svg viewBox="-30 -74 60 76" class="pointer-events-none absolute left-1/2 h-11 w-9 -translate-x-1/2" style="bottom:${b.pct}%" aria-hidden="true">${walkerArt(c.walker, "summit")}</svg>` : ""}
            <span class="pointer-events-none absolute z-10 hidden rounded-lg bg-cream px-2 py-1 text-sm whitespace-nowrap text-ink group-hover:block group-focus-visible:block
              ${alignClass[b.align]}" style="bottom:calc(${b.pct}% + 8px)">
              <b>${commas(b.value)}</b> on ${b.name}
            </span>
          </a>`}
        </li>`)}
      </ol>
    </div>

    <div></div>
    <div class="mt-1 flex gap-0.5 text-xs" aria-hidden="true">
      ${c.bars.map((b) => html`
      <span class="relative flex h-7 min-w-0 flex-1 flex-col items-center">
        <span class="whitespace-nowrap ${b.current ? "font-bold" : ""}">
          ${b.axisShort ? html`<span class="min-[380px]:hidden">${b.axisShort}</span><span class="max-[379px]:hidden">${b.axis}</span>` : b.axis}
        </span>
        ${b.current ? html`<span class="absolute top-4.5 size-1.5 rounded-full bg-cream"></span>` : ""}
      </span>`)}
    </div>
  </div>
</figure>`;
}

// messageHero is the short sky with a sleeping walker, under a big heading.
function messageHero(walkerKey, title) {
  return html`
<section class="on-sky relative overflow-hidden text-on-air">
  <div class="relative mx-auto max-w-xl">
    <svg viewBox="0 0 400 236" class="-mb-px block w-full overflow-visible" aria-hidden="true">
      ${shortHills}
      <g transform="translate(320 212)">${walkerArt(walkerKey, "asleep")}</g>
      ${shortSoil}
    </svg>
    <div class="absolute inset-x-0 top-0 px-5 pt-5 sm:px-6">
      <h1 class="max-w-52 font-display text-4xl leading-none font-extrabold sm:max-w-80 sm:text-5xl">${title}</h1>
    </div>
  </div>
</section>`;
}

const BIG_BUTTON = "min-h-13 flex-1 cursor-pointer rounded-xl px-5 font-display text-lg font-bold";
const OUTLINE_LINK = "flex min-h-13 flex-1 items-center justify-center rounded-xl border-2 border-meadow px-5 font-display text-lg font-bold";

export function clearScreen(v) {
  return html`
${messageHero(v.walker.key, "Clear all your data?")}
<section class="mx-auto max-w-xl px-4 pt-3 pb-28">
  ${v.days ? html`
  <p class="text-lg leading-snug">This permanently deletes <b>${plural(v.days, "day")} of steps</b> (${commas(v.steps)} steps in total) and resets your daily goal and character.</p>
  ` : html`
  <p class="text-lg leading-snug">You have no steps logged, so this only resets your daily goal and character.</p>
  `}
  <p class="mt-2 text-lg leading-snug">You can't undo this, unless you've <a href="#/backup" class="underline underline-offset-4">saved a backup</a>.</p>

  <form data-action="clear" class="mt-6 flex flex-col gap-3 sm:flex-row">
    <button class="${BIG_BUTTON} bg-pip text-ink">Clear all data</button>
    <a href="#/" class="${OUTLINE_LINK}">Keep my data</a>
  </form>
</section>`;
}

export function backupScreen(v) {
  if (v.pending) return restoreConfirm(v);
  return html`
${messageHero(v.walker.key, "Back up your steps")}
<section class="mx-auto max-w-xl px-4 pt-3 pb-28">
  <p class="text-lg leading-snug">Your steps are only saved in this browser on this device. If its data gets cleared, or you change phones, they're gone unless you have a backup.</p>
  <p class="mt-2 text-lg leading-snug">${v.lastBackup ? `Your last backup was on ${v.lastBackup}.` : "You haven't saved a backup yet."}</p>

  <div class="mt-6 flex flex-col gap-3 sm:flex-row">
    <button type="button" data-do="save-backup" class="${BIG_BUTTON} bg-sun text-ink">Save a backup</button>
    <button type="button" data-do="pick-backup" class="${BIG_BUTTON} border-2 border-meadow">Restore a backup</button>
  </div>
  <input id="backup-file" type="file" accept=".json,application/json" hidden>
  ${v.importError ? html`<p role="alert" class="mt-3 font-bold text-sun">${v.importError}</p>` : ""}
</section>`;
}

function restoreConfirm(v) {
  const { pending, current } = v;
  return html`
${messageHero(v.walker.key, "Restore this backup?")}
<section class="mx-auto max-w-xl px-4 pt-3 pb-28">
  <p class="text-lg leading-snug">This backup has <b>${plural(pending.days, "day")} of steps</b> (${commas(pending.totalSteps)} steps in total).</p>
  ${current.days ? html`
  <p class="mt-2 text-lg leading-snug">It replaces the <b>${plural(current.days, "day")} of steps</b> on this device, along with your goal and character. You can't undo this.</p>
  ` : ""}

  <form data-action="restore" class="mt-6 flex flex-col gap-3 sm:flex-row">
    <button class="${BIG_BUTTON} bg-sun text-ink">Restore this backup</button>
    <button type="button" data-do="cancel-restore" class="${BIG_BUTTON} border-2 border-meadow">Keep what I have</button>
  </form>
</section>`;
}

export function notFoundScreen(v) {
  return html`
${messageHero(v.walker.key, v.title)}
<section class="mx-auto max-w-xl px-4 pt-3 pb-28">
  <a href="#/" class="inline-flex min-h-11 items-center rounded-xl bg-sun px-5 font-display text-lg font-bold text-ink">Go to today</a>
</section>`;
}
