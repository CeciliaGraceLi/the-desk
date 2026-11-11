/* ============================================================
   exercises.js — the practice content. Pure data, no behaviour.

   An exercise is:
     id        unique, stable (completions reference it)
     kind      'sql' for now. 'value' and 'reveal' are planned for
               the tracks that cannot execute in a browser.
     s         skill key from SKILLS
     m         minutes
     t         title
     ask       what to return, in words
     shape     the columns expected, in order
     ordered   true when the row order is part of the answer
     ref       the reference query. Its output IS the expected answer,
               so there is no hand-written answer key to drift.
     hint      one nudge, shown on request
     notes     the worked solution: why this query, not just what
     res       resources — official docs, practice, the interview
               question it feeds

   Adding an exercise means adding an object here. Nothing else.
   ============================================================ */

const DOCS = {
  select: { label: 'SQLite — SELECT',                 url: 'https://www.sqlite.org/lang_select.html' },
  agg:    { label: 'SQLite — aggregate functions',    url: 'https://www.sqlite.org/lang_aggfunc.html' },
  win:    { label: 'SQLite — window functions',       url: 'https://www.sqlite.org/windowfunctions.html' },
  expr:   { label: 'SQLite — expressions (CASE)',     url: 'https://www.sqlite.org/lang_expr.html' },
  core:   { label: 'SQLite — scalar functions',       url: 'https://www.sqlite.org/lang_corefunc.html' },
  lemur:  { label: 'DataLemur SQL tutorial (R-S01)',  url: 'https://datalemur.com/sql-tutorial' },
  lc50:   { label: 'LeetCode SQL 50 (R-L03)',         url: 'https://leetcode.com/studyplan/top-sql-50/' }
};

const EXERCISES = [

/* ── 1 ─────────────────────────────────────────────────── */
{ id:'q1', kind:'sql', s:'sql', m:10, t:'Four firms, one quarter, sorted',
  ask:'Every firm in <b>Regional airlines</b> with its 2025 Q4 revenue, highest first.',
  shape:['firm_name', 'revenue_usd_m'], ordered:true,
  ref:`SELECT f.firm_name, r.revenue_usd_m
FROM firms f
JOIN quarterly_revenue r ON r.firm_id = f.firm_id
JOIN markets m          ON m.market_id = f.market_id
WHERE m.market_name = 'Regional airlines' AND r.year = 2025 AND r.quarter = 4
ORDER BY r.revenue_usd_m DESC`,
  hint:'Three tables. Start from <code>firms</code>, join revenue on <code>firm_id</code> and markets on <code>market_id</code>.',
  notes:`<p>Nothing clever here — this is the shape every later question sits on top of.
    The only thing worth noticing is that filtering the market by <i>name</i> rather than
    <code>market_id = 2</code> means you never have to remember which id is which.</p>
    <p>In a case team this is the query you write first, every time: pull the raw series and
    look at it before computing anything on it.</p>`,
  res:[DOCS.select, DOCS.lc50, { label:'Feeds IQ-S01 — join semantics', url:'' }] },

/* ── 2 ─────────────────────────────────────────────────── */
{ id:'q2', kind:'sql', s:'sql', m:10, t:'Total 2025 revenue by market',
  ask:'Each market with its total 2025 revenue (all four quarters, all firms), rounded to 1 decimal place, largest first.',
  shape:['market_name', 'total_revenue'], ordered:true,
  ref:`SELECT m.market_name, ROUND(SUM(r.revenue_usd_m), 1) AS total_revenue
FROM markets m
JOIN firms f             ON f.market_id = m.market_id
JOIN quarterly_revenue r ON r.firm_id = f.firm_id
WHERE r.year = 2025
GROUP BY m.market_name
ORDER BY total_revenue DESC`,
  hint:'<code>GROUP BY</code> the thing you want one row of. Everything else in the SELECT has to be aggregated.',
  notes:`<p><code>ROUND(SUM(x), 1)</code>, not <code>SUM(ROUND(x, 1))</code> — rounding before
    summing pushes the error up by the number of rows. On 48 rows it is small; on a damages
    model with 40,000 it is not, and opposing counsel will find it.</p>
    <p>Ordering by the alias <code>total_revenue</code> works in SQLite and Postgres. It does
    not work in every dialect, which is why you will also see the whole expression repeated
    in the <code>ORDER BY</code>.</p>`,
  res:[DOCS.agg, DOCS.lc50, { label:'Feeds IQ-S02 — conditional aggregation', url:'' }] },

/* ── 3 ─────────────────────────────────────────────────── */
{ id:'q3', kind:'sql', s:'sql', m:20, t:'Market shares without a second query',
  ask:'For <b>2025 Q4</b>, every firm with its share of its own market as a percent, rounded to 1 dp. Order by market name, then share descending.',
  shape:['market_name', 'firm_name', 'share_pct'], ordered:true,
  ref:`SELECT m.market_name, f.firm_name,
       ROUND(100.0 * r.revenue_usd_m
             / SUM(r.revenue_usd_m) OVER (PARTITION BY m.market_id), 1) AS share_pct
FROM quarterly_revenue r
JOIN firms f   ON f.firm_id = r.firm_id
JOIN markets m ON m.market_id = f.market_id
WHERE r.year = 2025 AND r.quarter = 4
ORDER BY m.market_name, share_pct DESC`,
  hint:'You need each row <i>and</i> its market total on the same line. That is what <code>SUM(...) OVER (PARTITION BY ...)</code> is for.',
  notes:`<p>This is the question that separates people who know window functions from people
    who write two queries and join them. <code>SUM(x) OVER (PARTITION BY market_id)</code>
    gives every row its market's total without collapsing the rows — which is exactly what a
    share is.</p>
    <p><code>100.0</code>, not <code>100</code>. Integer division is the single most common way
    a share table comes out all zeros.</p>
    <p>This is the first half of every market-definition exhibit you will ever be handed.</p>`,
  res:[DOCS.win, DOCS.lemur, { label:'Feeds IQ-S06 — window functions', url:'' }] },

/* ── 4 ─────────────────────────────────────────────────── */
{ id:'q4', kind:'sql', s:'sql', m:25, t:'HHI for each market',
  ask:'The Herfindahl–Hirschman Index for each market in <b>2025 Q4</b> — the sum of squared percent shares — rounded to a whole number, most concentrated first.',
  shape:['market_name', 'hhi'], ordered:true,
  ref:`WITH s AS (
  SELECT m.market_name,
         100.0 * r.revenue_usd_m
         / SUM(r.revenue_usd_m) OVER (PARTITION BY m.market_id) AS pct
  FROM quarterly_revenue r
  JOIN firms f   ON f.firm_id = r.firm_id
  JOIN markets m ON m.market_id = f.market_id
  WHERE r.year = 2025 AND r.quarter = 4
)
SELECT market_name, ROUND(SUM(pct * pct)) AS hhi
FROM s
GROUP BY market_name
ORDER BY hhi DESC`,
  hint:'Shares first, in a <code>WITH</code> block. Square and sum them in the outer query. Do not round the shares before squaring.',
  notes:`<p>Two levels: a CTE that produces shares (question 3), then an aggregate over it.
    You cannot nest a window function inside <code>SUM()</code> in one pass — SQL evaluates
    windows after grouping, so the share has to exist as a row before you can square it.</p>
    <p><b>Do not round inside the CTE.</b> Rounding each share to 1 dp before squaring moves the
    HHI by a few points, and a few points matter: under the 2023 Merger Guidelines a market is
    highly concentrated above 1,800, and a merger is presumptively unlawful if post-merger HHI
    exceeds 1,800 <i>and</i> ΔHHI exceeds 100.</p>
    <p>Read your own output: all three of these markets are above 1,800. Retail pharmacy at
    3,305 is the kind of number that makes the rest of the case about whether the market was
    defined correctly in the first place.</p>`,
  res:[DOCS.win, DOCS.agg, { label:'Feeds the Compass Lexecon market-definition case', url:'' }] },

/* ── 5 ─────────────────────────────────────────────────── */
{ id:'q5', kind:'sql', s:'sql', m:15, t:'Quarter-over-quarter growth with LAG',
  ask:'For <b>Northline Air</b> in 2025: each quarter with its revenue growth over the previous quarter, as a percent rounded to 2 dp. Q1 compares against 2024 Q4. Chronological order.',
  shape:['year', 'quarter', 'growth_pct'], ordered:true,
  ref:`WITH g AS (
  SELECT r.year, r.quarter, r.revenue_usd_m,
         LAG(r.revenue_usd_m) OVER (ORDER BY r.year, r.quarter) AS prev
  FROM quarterly_revenue r
  JOIN firms f ON f.firm_id = r.firm_id
  WHERE f.firm_name = 'Northline Air'
)
SELECT year, quarter, ROUND(100.0 * (revenue_usd_m - prev) / prev, 2) AS growth_pct
FROM g
WHERE year = 2025
ORDER BY year, quarter`,
  hint:'Filter to 2025 <i>after</i> the LAG, not before — otherwise Q1 has nothing to look back at.',
  notes:`<p>The trap is the <code>WHERE year = 2025</code>. Put it in the inner query and 2025 Q1
    returns NULL, because you deleted the row it needed to compare against. Put it in the outer
    query and the window still sees 2024 Q4.</p>
    <p>That is the general rule: a window function sees the rows that survive <code>WHERE</code>.
    If the comparison row matters, it has to survive too.</p>
    <p>Q4 comes out negative. Before you report that as a decline, look at the other firms —
    every one of them drops in Q4. It is seasonality in the data, not a Northline story.</p>`,
  res:[DOCS.win, DOCS.lemur, { label:'Feeds IQ-S07 — window functions', url:'' }] },

/* ── 6 ─────────────────────────────────────────────────── */
{ id:'q6', kind:'sql', s:'sql', m:20, t:'Top two firms in every market',
  ask:'The two largest firms in each market by total 2025 revenue, with that total rounded to 1 dp and the rank. Order by market name, then rank.',
  shape:['market_name', 'firm_name', 'total_revenue', 'rnk'], ordered:true,
  ref:`WITH t AS (
  SELECT m.market_id, m.market_name, f.firm_name,
         SUM(r.revenue_usd_m) AS total_revenue,
         RANK() OVER (PARTITION BY m.market_id ORDER BY SUM(r.revenue_usd_m) DESC) AS rnk
  FROM quarterly_revenue r
  JOIN firms f   ON f.firm_id = r.firm_id
  JOIN markets m ON m.market_id = f.market_id
  WHERE r.year = 2025
  GROUP BY m.market_id, m.market_name, f.firm_id, f.firm_name
)
SELECT market_name, firm_name, ROUND(total_revenue, 1) AS total_revenue, rnk
FROM t
WHERE rnk <= 2
ORDER BY market_name, rnk`,
  hint:'You cannot filter on a window function in the same <code>WHERE</code> that produced it. Rank in a CTE, filter outside it.',
  notes:`<p>Top-n-per-group is asked in almost every analyst screen, and this is the shape of the
    answer: rank inside a CTE, filter outside. <code>WHERE rnk &lt;= 2</code> in the same query
    that defines <code>rnk</code> is an error, because <code>WHERE</code> runs before the window.</p>
    <p><code>RANK</code> vs <code>DENSE_RANK</code> vs <code>ROW_NUMBER</code> is the follow-up
    question, so have the answer ready: on a tie, RANK leaves a gap (1,1,3), DENSE_RANK does not
    (1,1,2), ROW_NUMBER breaks the tie arbitrarily (1,2,3). For "top 2 and I mean exactly 2",
    ROW_NUMBER is the safe one.</p>
    <p>Note that you can aggregate inside the <code>OVER</code> clause —
    <code>ORDER BY SUM(...)</code> — because the window is evaluated after the GROUP BY.</p>`,
  res:[DOCS.win, DOCS.lc50, { label:'Feeds IQ-S06 — window functions', url:'' }] },

/* ── 7 ─────────────────────────────────────────────────── */
{ id:'q7', kind:'sql', s:'sql', m:15, t:'Running total per firm',
  ask:'For every firm in <b>Grocery delivery</b>: each quarter with cumulative revenue from 2024 Q1 up to and including that quarter, rounded to 1 dp. Order by firm name, then chronologically.',
  shape:['firm_name', 'year', 'quarter', 'cum_revenue'], ordered:true,
  ref:`SELECT f.firm_name, r.year, r.quarter,
       ROUND(SUM(r.revenue_usd_m) OVER (
         PARTITION BY f.firm_id ORDER BY r.year, r.quarter
         ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW), 1) AS cum_revenue
FROM quarterly_revenue r
JOIN firms f   ON f.firm_id = r.firm_id
JOIN markets m ON m.market_id = f.market_id
WHERE m.market_name = 'Grocery delivery'
ORDER BY f.firm_name, r.year, r.quarter`,
  hint:'<code>PARTITION BY</code> restarts the total for each firm. <code>ORDER BY</code> inside <code>OVER</code> is what makes it cumulative rather than a flat total.',
  notes:`<p>An <code>ORDER BY</code> inside <code>OVER</code> implies a frame of
    <code>RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW</code>, so this works without
    writing the frame out. Write it out anyway.</p>
    <p>The reason is ties. <code>RANGE</code> includes every <i>peer</i> row — rows with the same
    ORDER BY value — so with duplicate dates a RANGE frame silently sums them all into one step
    while <code>ROWS</code> walks them one at a time. Here the key is unique and both give the
    same answer; in a transactions table with several rows on the same day they do not, and that
    is a bug you will spend an afternoon on.</p>`,
  res:[DOCS.win, DOCS.lemur, { label:'Feeds IQ-S07 — running totals', url:'' }] },

/* ── 8 ─────────────────────────────────────────────────── */
{ id:'q8', kind:'sql', s:'sql', m:25, t:'Before and after the merger announcement',
  ask:`Quill Airways announced its acquisition of Rowan Air on <b>2025-01-15</b> (it is in the <code>events</code> table).
       For each firm in <b>Regional airlines</b>: mean quarterly revenue before that date, mean after, and the difference —
       each rounded to 1 dp. Compare on <code>quarter_start</code>. Order by firm name.`,
  shape:['firm_name', 'mean_before', 'mean_after', 'diff'], ordered:true,
  ref:`SELECT f.firm_name,
       ROUND(AVG(CASE WHEN r.quarter_start <  '2025-01-15' THEN r.revenue_usd_m END), 1) AS mean_before,
       ROUND(AVG(CASE WHEN r.quarter_start >= '2025-01-15' THEN r.revenue_usd_m END), 1) AS mean_after,
       ROUND(AVG(CASE WHEN r.quarter_start >= '2025-01-15' THEN r.revenue_usd_m END)
           - AVG(CASE WHEN r.quarter_start <  '2025-01-15' THEN r.revenue_usd_m END), 1) AS diff
FROM quarterly_revenue r
JOIN firms f   ON f.firm_id = r.firm_id
JOIN markets m ON m.market_id = f.market_id
WHERE m.market_name = 'Regional airlines'
GROUP BY f.firm_id, f.firm_name
ORDER BY f.firm_name`,
  hint:'One pass, not two. <code>AVG(CASE WHEN ... THEN x END)</code> averages only the rows that match, because <code>AVG</code> skips NULLs.',
  notes:`<p>Conditional aggregation: <code>CASE</code> with no <code>ELSE</code> yields NULL, and
    <code>AVG</code> ignores NULLs, so one pass gives you both periods side by side. Writing
    <code>ELSE 0</code> instead is the classic error — it drags the mean toward zero by counting
    the rows you meant to exclude.</p>
    <p>Dates as <code>'YYYY-MM-DD'</code> text compare correctly with <code>&lt;</code> in SQLite
    because the format sorts lexicographically. That is a property of ISO 8601, not of SQLite
    being clever, and it is the reason to always store dates that way.</p>
    <p><b>Now read the result as an economist, not a programmer.</b> Every firm's mean is higher
    after — including Pinnacle Regional, which is not party to the merger. A before/after
    difference on its own cannot separate the merger from the trend that was already there. That
    is exactly why a damages estimate needs a control group or a but-for series, and it is the
    criticism you should expect to face in an interview if you present this number alone.</p>`,
  res:[DOCS.expr, DOCS.agg, { label:'Feeds the before/during/after damages framework', url:'' }] }

];

/* Schema shown beside the editor. Kept here so the content file owns it. */
const SCHEMA = [
  { t:'markets',           c:['market_id INTEGER', 'market_name TEXT'], n:3 },
  { t:'firms',             c:['firm_id INTEGER', 'firm_name TEXT', 'market_id INTEGER', 'hq_state TEXT'], n:12 },
  { t:'quarterly_revenue', c:['firm_id INTEGER', 'year INTEGER', 'quarter INTEGER', 'quarter_start TEXT', 'revenue_usd_m REAL'], n:96 },
  { t:'events',            c:['event_id INTEGER', 'market_id INTEGER', 'event_date TEXT', 'event_type TEXT', 'detail TEXT'], n:3 }
];
