# The Desk

A practice tracker for someone preparing for analytics, financial analysis and economic consulting roles.

**Live:** https://ceciliagraceli.github.io/the-desk/

You tell it how long you have. It gives you one real task. You do the work in your own tools, log how it went in four taps, and an artifact lands on the desk.

---

## The problem

Most learning trackers measure the wrong thing. They count hours, days, or lessons watched — all of which you can accumulate without becoming able to do anything. A streak proves you showed up. It does not prove you can write a window function under time pressure, or defend an R² of 0.11 to someone who thinks it means the model is broken.

The second problem is friction. Reflection tools ask you to write about what you struggled with, so you stop using them by week two.

## The design

**Three rules, and every feature follows from one of them.**

### 1. The reward is the evidence

There are no points and no badges. Finishing a task puts an artifact on the desk — a regression printout, a query, a rebuilt statement, a waveform for a recorded answer. The grid filling up *is* the progress display. A brass pin marks the artifacts concrete enough to show an employer.

The streak counter exists, but its label says "days in a row showing up" and the footer states outright that it is not evidence of skill. That is deliberate: a number on screen implies a claim, so the claim should be accurate.

### 2. Track state is earned from outcomes, never from time

Each of the five tracks moves through **Not started → Building → Solid → Interview-ready** based on completed tasks and how they went:

| State | Requires |
|---|---|
| Building | at least one finished task |
| Solid | ≥ 3 finished, ≥ 60% done cold |
| Interview-ready | ≥ 5 finished, ≥ 70% done cold |
| **Needs review** | 2+ shaky results in the last 4 — overrides everything above |

The review override matters more than the ladder. A track with a good lifetime average but a bad recent run is a track you cannot currently rely on, and the point is what you can do *now*.

### 3. Reflection is four taps

After each task: one of **Did it cold / Needed a reference / Got partway / Stuck**, plus one optional chip — *the concept*, *syntax*, *debugging*, *explaining the result*. No text field. Those two signals drive the review flag and the recommender; a paragraph would not drive them any better and would not get written.

## How the recommender works

`Engine.rank()` scores every task that fits the budget:

```
+40   track has the fewest finished tasks
+0–20 track untouched longest (3 points per day, capped)
−18   per previous completion of this exact task
+16   track currently flagged Needs review
+12   exercise that runs and checks itself
+0–10 task length close to the budget
```

Highest score wins; **Different task** takes the runner-up. The weights are a first guess and visibly arbitrary — they are in one function precisely so they can be tuned once there is real usage data to tune against.

## Structure

```
the-desk/
├── index.html          markup only — no logic, no content
├── css/style.css       tokens first, then components
├── vendor/sql.js/      SQLite compiled to WebAssembly (MIT), vendored
└── js/
    ├── tasks.js        content. The task bank. Edit this to add tasks
    ├── exercises.js    content. The runnable exercises and the schema
    ├── db.js           the seed database and the result comparison
    ├── store.js        persistence. localStorage, export/import
    ├── recommend.js    logic. Stats, track state, requirements, streak, ranking. No DOM
    └── app.js          view. Router, five views, DOM
```

Four views sit behind a hash router — `#/today`, `#/desk`, `#/tracks`, `#/about` — so each
has its own URL, the back button works, and a view can be linked to directly. The top bar
is persistent and carries the artifact count and the streak pill.

The palette is night by default, because the page is meant to be used in the evening after
class. A daylight theme is one toggle away in the top bar and is remembered.

The split is the point: `recommend.js` has no DOM access and `app.js` has no business rules, so the scoring logic can be reasoned about — or tested — without a browser. Adding a task means editing one data file.

No framework and no build step. One dependency — [sql.js](https://github.com/sql-js/sql.js)
(SQLite compiled to WebAssembly, MIT), vendored rather than pulled from a CDN so the site keeps
working offline and does not depend on anyone else's uptime. It is a static site; `git push`
deploys it.

## Practice

The SQL exercises execute. A seeded SQLite database — three markets, four firms in each, eight
quarters of revenue, a few dated events — is built in the browser on load, you write a query
against it, and the rows you get back are compared against the expected answer.

The expected answer is not written down. Each exercise carries a *reference query*, and whatever
that query returns is the answer, so the key cannot drift out of step with the data when the seed
changes. Comparison ignores column names, matches numbers within a small tolerance, and only
enforces row order when the question asks for an order.

Solving an exercise logs a completion like any other task — it lands on the desk, it moves the
track. The outcome is inferred from whether help was used (no help → cold, hint → needed a
reference, solution opened → got partway) and one tap corrects it.

Stata and Excel cannot run in a browser, and nothing claims otherwise. Those tracks keep the
do-it-in-your-own-tools loop, and the planned addition for them is an answer box checked against
an expected value with a worked derivation behind it — not a fake console.

## Data and privacy

Everything is stored in `localStorage` under one key, in your browser. Nothing is uploaded and there is no backend. The page is public; your log is not, because it never leaves the machine you typed it on.

That has one consequence worth knowing: **localStorage is per-browser and per-device.** Clearing site data erases it. Use **Export JSON** before you clear anything or switch browsers. Import merges by entry id rather than overwriting, so restoring an old backup never destroys newer work.

## What I would change

- **The weights are guesses.** They need real usage before they mean anything. The honest version of this project ships, gets used for a month, and then the ranking gets rewritten against what actually happened.
- **"Did it cold" is self-reported.** Nothing verifies it. A version that timed the work, or checked an answer, would produce a track state worth more.
- **Eight runnable exercises, and only in SQL.** Python can run in the browser too (Pyodide);
  it is a ~10MB download, which is the only reason it is not here yet.
- **Twenty-two tasks is thin.** It runs dry in a few weeks of daily use.
- **No spaced repetition.** A task done cold in October should resurface in November to check it stuck. Right now a completed task is simply deprioritised forever.
- **Accessibility is adequate, not good.** Buttons carry `aria-pressed` and focus is visible, but the desk grid and track bars are not described for a screen reader.

## Running it locally

```bash
git clone https://github.com/CeciliaGraceLi/the-desk.git
cd the-desk
python3 -m http.server 8000     # or just open index.html
```

No install step. Opening `index.html` directly works too — there are no modules and nothing is fetched.

## Licence

MIT — see [LICENSE](LICENSE).
