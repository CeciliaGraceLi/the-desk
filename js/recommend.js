/* ============================================================
   recommend.js — the logic layer. No DOM in here.

   Two jobs:
     1. Turn a list of completions into per-track statistics,
        and from those into an earned state.
     2. Choose the next task for a given time budget.

   Design note: every state transition is driven by *finished work*
   — counts and outcomes — never by elapsed time or session count.
   A streak is reported, but it is deliberately not an input to
   anything, because showing up is not the same as being able to.
   ============================================================ */

const Engine = (function () {

  const DAY = 86400000;
  const iso = d => d.toLocaleDateString('en-CA');
  const today = () => iso(new Date());
  const taskById = id => TASKS.find(t => t.id === id);

  /** Per-track counts, outcomes, friction tallies and last-touched date. */
  function stats(completions) {
    const m = {};
    Object.keys(SKILLS).forEach(k => {
      m[k] = { n: 0, cold: 0, outcomes: [], last: null, friction: {} };
    });
    completions.forEach(c => {
      const t = taskById(c.taskId);
      if (!t || !m[t.s]) return;
      const s = m[t.s];
      s.n++;
      if (c.out === 'cold') s.cold++;
      s.outcomes.push(c.out);
      if (!s.last || c.date > s.last) s.last = c.date;
      if (c.friction) s.friction[c.friction] = (s.friction[c.friction] || 0) + 1;
    });
    return m;
  }

  /**
   * Earned state for a track. Order matters: a recent run of trouble
   * overrides a good lifetime average, because the point is what you
   * can do now, not what you could do in September.
   */
  function trackState(s) {
    if (!s.n) return ['Not started', ''];

    const recent = s.outcomes.slice(-4);
    const shaky = recent.filter(o => o === 'stuck' || o === 'part').length;
    if (s.n >= 2 && shaky >= 2) return ['Needs review', 'review'];

    const rate = s.cold / s.n;
    if (s.n >= 5 && rate >= 0.7) return ['Interview-ready', 'ready'];
    if (s.n >= 3 && rate >= 0.6) return ['Solid', 'solid'];
    return ['Building', ''];
  }

  /**
   * What the track needs to reach its next state, phrased as finished work.
   * The count assumes the next results are all cold — stated as such, because
   * a target that silently assumed a worse run would be a different number.
   */
  function requirement(s) {
    const [label, cls] = trackState(s);
    if (cls === 'review')
      return 'Two or more shaky results in the last four. Repeat work here until the recent run is clean.';
    if (label === 'Not started')
      return 'One finished task starts this track.';
    if (label === 'Interview-ready')
      return 'Holding. Stays here while 5+ finished sit at 70% cold or better.';

    // Smallest number of further cold results that satisfies both the count
    // and the rate for the next tier.
    const need = (minN, rate) => Math.max(
      minN - s.n,
      Math.ceil((rate * s.n - s.cold) / (1 - rate)),
      1
    );
    return label === 'Solid'
      ? `${need(5, 0.7)} more done cold reaches Interview-ready.`
      : `${need(3, 0.6)} more done cold reaches Solid.`;
  }

  /** Consecutive days with at least one completion, counting back from today. */
  function streak(completions) {
    const days = [...new Set(completions.map(c => c.date))].sort().reverse();
    if (!days.length) return 0;

    const yesterday = iso(new Date(Date.now() - DAY));
    if (days[0] !== today() && days[0] !== yesterday) return 0;

    let n = 1;
    let cursor = days[0];
    for (let i = 1; i < days.length; i++) {
      const expected = iso(new Date(Date.parse(cursor) - DAY));
      if (days[i] !== expected) break;
      n++;
      cursor = expected;
    }
    return n;
  }

  /**
   * Rank every task that fits the budget. Highest score first.
   *
   * The weights encode four preferences, in rough order of strength:
   *   - go to the track with the fewest finished tasks
   *   - go to the track left alone longest
   *   - prefer something not done before
   *   - fill the budget rather than undershoot it
   * A track flagged for review gets a deliberate nudge upward.
   */
  function rank(completions, budget) {
    const st = stats(completions);
    const doneToday = new Set(completions.filter(c => c.date === today()).map(c => c.taskId));
    const timesDone = {};
    completions.forEach(c => { timesDone[c.taskId] = (timesDone[c.taskId] || 0) + 1; });

    const pool = TASKS.filter(t => t.m <= budget && !doneToday.has(t.id));
    if (!pool.length) return [];

    const fewest = Math.min(...Object.values(st).map(s => s.n));

    return pool
      .map(t => {
        const s = st[t.s];
        let score = 0;
        score += (s.n === fewest) ? 40 : Math.max(0, 24 - s.n * 4);
        score += s.last ? Math.min(20, (Date.parse(today()) - Date.parse(s.last)) / DAY * 3) : 20;
        score -= (timesDone[t.id] || 0) * 18;
        if (trackState(s)[1] === 'review') score += 16;
        score += Math.max(0, 10 - (budget - t.m) / 6);
        return { t, score };
      })
      .sort((a, b) => b.score - a.score)
      .map(x => x.t);
  }

  return { stats, trackState, requirement, streak, rank, today, taskById };
})();
