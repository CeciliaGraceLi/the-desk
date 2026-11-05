/* ============================================================
   tasks.js — the content layer. Pure data, no behaviour.
   Edit this file to add tasks; nothing else needs to change.

   A task is:
     id    unique, stable (completions reference it)
     s     skill key, must exist in SKILLS
     m     minutes — the recommender only offers tasks that fit
     t     title
     brief what to actually do
     why   why this task is worth the time
     done  what finishing looks like
     good  what a strong answer contains
   ============================================================ */

const SKILLS = {
  py:    { n: 'Python & pandas',                 art: 'code'  },
  sql:   { n: 'SQL',                             art: 'query' },
  stata: { n: 'Stata & econometrics',            art: 'reg'   },
  xl:    { n: 'Excel & modeling',                art: 'sheet' },
  talk:  { n: 'Interpretation & communication',  art: 'mic'   }
};

/* Tasks whose output is concrete enough to show an employer.
   Earns the brass pin on the desk when finished cold or with a reference. */
const SHOWABLE = new Set(['py1', 'st1', 'xl1', 'xl2', 'xl3', 'tk4']);

const TASKS = [

  /* ── Python & pandas ─────────────────────────────────── */
  { id:'py1', s:'py', m:20, t:'Reproduce your own cleaning rules in pandas',
    brief:'Load the CPS extract in pandas and apply the same cleaning you did in Stata — wage 0 or 99,999,999 to missing, age under 14 to missing, hours 999 to missing. Report the surviving N.',
    why:'You can state 75,854 from memory. Being able to <em>regenerate</em> it in a second language is what makes it yours rather than remembered.',
    done:'A cell that prints the row count after each filter, and a final N you can compare against 75,854.',
    good:'You notice if the numbers differ and can say why — a different IPUMS extract, a different order of operations, or a rule you applied implicitly in Stata.' },

  { id:'py2', s:'py', m:30, t:'Returns, rolling vol, max drawdown — no loops',
    brief:'Write three functions over a price series: daily returns, 20-day rolling volatility annualised, and maximum drawdown. Vectorised only.',
    why:'The standard warm-up for any quant-adjacent screen. Drawdown in particular trips people, because it needs a running maximum.',
    done:'Three functions, each one expression where possible. Test on any ticker you like.',
    good:'Annualising with √252 and being able to say why. Drawdown computed off <code>cummax()</code>, not a loop.' },

  { id:'py3', s:'py', m:25, t:'Pick a denominator and defend it',
    brief:'Take any grouped dataset you have. Compute a rate by segment — but write one sentence first stating what the denominator should be and why.',
    why:'Nearly every analytical argument that falls apart in an interview falls apart at the denominator. Choosing it out loud is the habit.',
    done:'A groupby producing rate and count side by side, plus your one-sentence justification.',
    good:'You report <em>n</em> alongside every rate, and you flag any segment too small to act on.' },

  { id:'py4', s:'py', m:15, t:'A merge that changes the row count',
    brief:'Construct a merge where the result has more rows than the left table. Then prevent it using <code>validate=</code>.',
    why:'"My left join returned more rows than I started with — why?" is asked constantly, and the answer is duplicate keys on the right.',
    done:'A before/after row count, and a merge that raises rather than silently duplicating.',
    good:'You can state the four <code>validate</code> options, and you check keys with <code>COUNT(*)</code> vs <code>COUNT(DISTINCT)</code> thinking before merging.' },

  /* ── SQL ─────────────────────────────────────────────── */
  { id:'sq1', s:'sql', m:20, t:'Monthly retention, out loud',
    brief:'Write a query returning, for each month, the share of active users who were also active the following month. Narrate your reasoning aloud while you write it.',
    why:'The single most common analytics SQL question — and the narration is half the test.',
    done:'One query using a self-join or CTE, with the LEFT JOIN preserving users who did not return.',
    good:'You say why it must be a LEFT JOIN, and you handle the final month having no successor.' },

  { id:'sq2', s:'sql', m:15, t:'Top 2 per group — and justify the function',
    brief:'Return the top two products by revenue within each category. Then say why you picked ROW_NUMBER, RANK or DENSE_RANK.',
    why:'The query is easy. The follow-up — "what happens on a tie?" — is the real question.',
    done:'A windowed query plus one sentence on tie behaviour.',
    good:'ROW_NUMBER gives exactly two rows and breaks ties arbitrarily; DENSE_RANK can return three. Which you want depends on the business question.' },

  { id:'sq3', s:'sql', m:25, t:'Running total and moving average in one pass',
    brief:'One query returning monthly revenue, a cumulative running total, and a 3-month moving average.',
    why:'Window frames are where SQL candidates separate. Most people know OVER; fewer know ROWS BETWEEN.',
    done:'A single query — no subquery per column.',
    good:'You can explain <code>ROWS BETWEEN 2 PRECEDING AND CURRENT ROW</code>, and what changes if you use RANGE instead of ROWS.' },

  { id:'sq4', s:'sql', m:20, t:'Find the rows that should not exist',
    brief:'Write the anti-join that finds customers with no orders, then the dedup query that keeps only the latest row per id.',
    why:'Data-quality questions are the ones that actually come up on the job, and both patterns appear in interviews constantly.',
    done:'Two queries: LEFT JOIN … IS NULL, and ROW_NUMBER partitioned by id ordered by updated_at.',
    good:'You mention NOT EXISTS as the alternative, and know it behaves differently with NULLs than NOT IN.' },

  /* ── Stata & econometrics ────────────────────────────── */
  { id:'st1', s:'stata', m:30, t:'Narrate complete_regression.do line by line',
    brief:'Open <code>~/Desktop/coding/Github/complete_regression.do</code>. Read it aloud, line by line, explaining what each does and why. Record it if you can.',
    why:'An interviewer will ask you to walk through this. You know the outputs cold; the question is whether you know the code.',
    done:'A pass through the whole file where nothing makes you pause.',
    good:'You can justify the robust standard errors, the sample restrictions and the variable choices — and say what you would add if you ran it again.' },

  { id:'st2', s:'stata', m:25, t:'Add an interaction and interpret it',
    brief:'Re-run the wage regression with an interaction between sex and usual weekly hours. Interpret the coefficient in a sentence a non-economist would follow.',
    why:'Interactions are where "I ran a regression" becomes "I understand a regression" — and this is a plausible follow-up to your own project.',
    done:'The new output, plus your one-sentence interpretation written down.',
    good:'You interpret the interaction as a difference in slopes, not levels, and check significance before leaning on it.' },

  { id:'st3', s:'stata', m:20, t:'Defend an R² of 0.11',
    brief:'Write three sentences arguing your wage model is useful despite explaining 11% of variation. Then one sentence conceding what it genuinely cannot do.',
    why:'Someone will raise it. The weak answer is defensive; the strong one separates fit from inference.',
    done:'Four sentences, written.',
    good:'Individual wage variation is mostly idiosyncratic; low R² is normal in cross-sectional micro data; the coefficients are precisely estimated and that is what the question needed. The concession: it predicts any given person poorly.' },

  { id:'st4', s:'stata', m:25, t:'Turn your regression into a damages model',
    brief:'On paper, restructure the wage regression as a cartel overcharge model: price on cost controls plus a conduct-period dummy. Map each piece across.',
    why:'This is the exact bridge from your project to economic consulting work, and a question you could be asked directly.',
    done:'A short mapping — what plays the role of the outcome, the controls, the dummy of interest.',
    good:'You see that your demographic dummies and a conspiracy dummy do the same statistical job, and you can name the threat: omitted variables correlated with the conduct period.' },

  /* ── Excel & modeling ────────────────────────────────── */
  { id:'xl1', s:'xl', m:45, t:'JetBlue income statement, live formulas',
    brief:'Rebuild the income statement in <code>JetBlue_Financial_Statements_2023-2025.xlsx</code> so every subtotal is a SUM and every year-over-year change is a calculation.',
    why:'This workbook is your submitted writing sample and currently contains no formulas. If an interviewer asks how a number moves, the model needs to answer.',
    done:'Totals that recalculate when an input changes. Blue for inputs, black for formulas.',
    good:'You verify the figures against the 10-K on EDGAR before building on them.' },

  { id:'xl2', s:'xl', m:40, t:'A balance sheet that balances by formula',
    brief:'Rebuild the JetBlue balance sheet with live formulas and add an explicit check row: assets minus liabilities and equity, which must read zero.',
    why:'The check row is the thing modellers look for. Its absence says more than any single number.',
    done:'A balance sheet with a visible, formula-driven check that reads 0.',
    good:'The check is conditionally formatted so a break is impossible to miss.' },

  { id:'xl3', s:'xl', m:20, t:'One sensitivity table: margin against fuel',
    brief:'Build a two-way data table showing JetBlue operating margin across a range of fuel costs and load factors.',
    why:'"What happens if fuel rises 15%?" is the obvious question about an airline, and a data table answers it instantly.',
    done:'A working two-way data table with labelled axes.',
    good:'You pick a plausible range rather than a symmetric one, and can say which direction actually threatens the business.' },

  { id:'xl4', s:'xl', m:35, t:'Next WSP lesson, then fill the matching sheet',
    brief:'Watch the next unwatched lesson in the Financial Statement Modeling course, then fill the corresponding Empty sheet in the walkthrough workbook <em>before</em> checking the Complete version.',
    why:'The workbook is built as Empty → Complete pairs precisely so you build before you look. Watching without filling is how a course gets forgotten.',
    done:'One lesson, one sheet attempted, then compared.',
    good:'You note every cell where yours differed from the answer — not just whether it matched.' },

  /* ── Interpretation & communication ──────────────────── */
  { id:'tk1', s:'talk', m:10, t:'Timed: the Olipop premium',
    brief:'Ninety seconds. Olipop at $17.00 receives one PepsiCo share worth $22.50. State the premium and what the number means. Time yourself.',
    why:'Premium arithmetic is the opening move of any appraisal case, and it has to be instant.',
    done:'The number said aloud inside 90 seconds, with the reasoning attached.',
    good:'32.4%, measured against the <em>unaffected</em> price — and you say the word "unaffected" and explain why it matters.' },

  { id:'tk2', s:'talk', m:15, t:'Timed: HHI both ways, then the real theory',
    brief:'Compute ΔHHI for PepsiCo/Olipop under a narrow and a broad market definition. Then say what the actual theory of harm has to be.',
    why:'The structural screen clears under both definitions — so the case has to rest on something else. Spotting that is the whole point.',
    done:'Both numbers, then one sentence naming the theory.',
    good:'Narrow: no overlap, ΔHHI 0. Broad: 2 × 25 × 0.3 = 15, far under 100. So the theory is nascent competition — buying a disruptor before it grows.' },

  { id:'tk3', s:'talk', m:10, t:'Explain R² to someone non-technical',
    brief:'Sixty seconds, out loud, no jargon: what R² is, and why a high one does not mean the model is right.',
    why:'Explaining a technical idea plainly is scored in every consulting interview, and this one is a trap question.',
    done:'A 60-second explanation you would be happy for a client to hear.',
    good:'You separate fit from causation, and give an example of a high-R² model that is still biased.' },

  { id:'tk4', s:'talk', m:15, t:'Walk through the wage project — recorded',
    brief:'Two minutes, recorded: the question, the data, the method, one finding with a number, and one limitation. Then listen back.',
    why:'The most likely single question in any of your five economic consulting interviews.',
    done:'A recording under two minutes that you would be happy to send to a friend.',
    good:'You lead with the question rather than the dataset, and the limitation is specific — cross-sectional, no causal identification.' },

  { id:'tk5', s:'talk', m:15, t:'Cartel overcharge, cold',
    brief:'Benchmark price $0.0850, observed $0.1020, aluminium cost up 9% from $0.0340, volume 2.4bn cans. Compute the adjusted overcharge and the damages. No notes.',
    why:'But-for reasoning is the core of damages work, and the confounder adjustment is what separates a real answer from subtraction.',
    done:'The adjusted overcharge and the damages figure, derived without looking anything up.',
    good:'But-for $0.08806, overcharge $0.01394 (15.8%), damages $33.5M — and you mention trebling unprompted.' },

  { id:'tk6', s:'talk', m:10, t:'Name the dataset',
    brief:'Rewrite your "Predictive Risk Analytics" answer so it names the Titanic dataset in the first sentence and frames it as a methods exercise. Say it aloud twice.',
    why:'Your own take-history flagged this: you described the model without the disclosure. Being caught not naming it costs far more than naming it.',
    done:'A spoken version that leads with the dataset and still sounds confident.',
    good:'0.88 ROC-AUC, 0.77 precision, 0.73 recall — chosen over accuracy because the classes are imbalanced. The data is a teaching set; the pipeline is the transferable part.' }
];

/* Inline SVG per artifact type. currentColor so the outcome tints them. */
const GLYPHS = {
  code: '<svg width="34" height="26" viewBox="0 0 34 26" fill="none" aria-hidden="true"><rect x=".6" y=".6" width="32.8" height="24.8" rx="2.4" stroke="currentColor" stroke-opacity=".3"/><path d="M10 8 6 13l4 5M24 8l4 5-4 5M19 7l-4 12" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  query:'<svg width="34" height="26" viewBox="0 0 34 26" fill="none" aria-hidden="true"><rect x=".6" y=".6" width="32.8" height="24.8" rx="2.4" stroke="currentColor" stroke-opacity=".3"/><ellipse cx="17" cy="8" rx="8" ry="3" stroke="currentColor" stroke-width="1.5"/><path d="M9 8v9c0 1.7 3.6 3 8 3s8-1.3 8-3V8" stroke="currentColor" stroke-width="1.5"/><path d="M9 12.5c0 1.7 3.6 3 8 3s8-1.3 8-3" stroke="currentColor" stroke-width="1.5"/></svg>',
  reg:  '<svg width="34" height="26" viewBox="0 0 34 26" fill="none" aria-hidden="true"><rect x=".6" y=".6" width="32.8" height="24.8" rx="2.4" stroke="currentColor" stroke-opacity=".3"/><path d="M6 20 28 7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><circle cx="10" cy="17" r="1.6" fill="currentColor"/><circle cx="16" cy="15" r="1.6" fill="currentColor"/><circle cx="21" cy="11" r="1.6" fill="currentColor"/><circle cx="26" cy="10" r="1.6" fill="currentColor"/></svg>',
  sheet:'<svg width="34" height="26" viewBox="0 0 34 26" fill="none" aria-hidden="true"><rect x=".6" y=".6" width="32.8" height="24.8" rx="2.4" stroke="currentColor" stroke-opacity=".3"/><path d="M1 9h32M1 17h32M13 1v24M23 1v24" stroke="currentColor" stroke-width="1.2" stroke-opacity=".55"/></svg>',
  mic:  '<svg width="34" height="26" viewBox="0 0 34 26" fill="none" aria-hidden="true"><rect x=".6" y=".6" width="32.8" height="24.8" rx="2.4" stroke="currentColor" stroke-opacity=".3"/><path d="M7 13v3M11 10v9M15 6v14M19 9v10M23 12v4M27 11v6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>'
};
