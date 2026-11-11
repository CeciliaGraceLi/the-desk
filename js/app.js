/* ============================================================
   app.js — the view layer. Reads Store, asks Engine, draws DOM.

   Four views behind a hash router (#/today, #/desk, #/tracks,
   #/about). Each has its own URL, so the back button and a
   bookmark both work. No business rules live here.
   ============================================================ */

(function () {
  const $ = id => document.getElementById(id);
  const esc = s => { const d = document.createElement('div'); d.textContent = s == null ? '' : s; return d.innerHTML; };

  const VIEWS = ['today', 'practice', 'desk', 'tracks', 'about'];
  const BUDGETS = [15, 30, 60, 90];
  const OUTCOMES = [
    ['cold',  'Did it cold'],
    ['ref',   'Needed a reference'],
    ['part',  'Got partway'],
    ['stuck', 'Stuck']
  ];
  const FRICTIONS = [
    ['concept', 'the concept'],
    ['syntax',  'syntax'],
    ['debug',   'debugging'],
    ['explain', 'explaining the result']
  ];

  let budget = null;
  let current = null;
  let pendingOutcome = null;
  let pendingFriction = null;
  let deskFilter = 'all';
  let exId = null;

  /* Exercises are tasks too: registering them here means the desk, the
     track states and the recommender all see them with no special cases.
     `ex:true` is the only thing the view treats differently — it sends
     you to Practice instead of asking you to go and do it elsewhere. */
  EXERCISES.forEach(e => TASKS.push({
    id: e.id, s: e.s, m: e.m, t: e.t, ex: true,
    brief: e.ask,
    why:   'Runnable here — you write the query, the database runs it, and the rows are checked.',
    done:  'The checker says the rows match.',
    good:  'You can say why that query and not another one, and read the result as an economist rather than a programmer.'
  }));

  /** A result set as a table. */
  function grid(r) {
    if (!r.cols.length) return `<p class="hint" style="margin-top:12px">That statement returned no result set.</p>`;
    const head = r.cols.map(c => `<th>${esc(c)}</th>`).join('');
    const body = r.rows.slice(0, 60).map(row =>
      `<tr>${row.map(c => `<td${typeof c === 'number' ? ' class="num"' : ''}>${c === null ? '<i>NULL</i>' : esc(c)}</td>`).join('')}</tr>`
    ).join('');
    const more = r.rows.length > 60 ? `<p class="hint">…${r.rows.length - 60} more rows.</p>` : '';
    return `<div class="gridwrap"><table class="rgrid mono"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>
      <p class="hint">${r.rows.length} row${r.rows.length === 1 ? '' : 's'}.</p>${more}`;
  }

  /* ══ router ════════════════════════════════════════════ */
  function viewName() {
    const m = /^#\/([a-z]+)/.exec(location.hash);
    return m && VIEWS.includes(m[1]) ? m[1] : 'today';
  }

  function route() {
    const v = viewName();
    const sub = (/^#\/[a-z]+\/([\w-]+)/.exec(location.hash) || [])[1];
    VIEWS.forEach(k => { $('v-' + k).hidden = k !== v; });
    [...document.querySelectorAll('#nav a')].forEach(a => {
      const on = a.dataset.v === v;
      a.classList.toggle('on', on);
      if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
    if (v === 'desk')   renderDesk();
    if (v === 'tracks') renderTracks();
    if (v === 'practice') {
      if (sub && EXERCISES.some(e => e.id === sub)) exId = sub;
      renderPractice();
    }
    window.scrollTo({ top: 0 });
  }

  /* ══ theme ═════════════════════════════════════════════ */
  function applyTheme(t) {
    if (t === 'day') document.documentElement.setAttribute('data-theme', 'day');
    else document.documentElement.removeAttribute('data-theme');
    $('theme').setAttribute('aria-label', t === 'day' ? 'Switch to night' : 'Switch to daylight');
  }
  $('theme').addEventListener('click', () => {
    const next = Store.profile().theme === 'day' ? 'night' : 'day';
    Store.setProfile({ theme: next });
    applyTheme(next);
  });

  /* ══ TODAY: budget → one task → check-in ═══════════════ */
  function renderBudget() {
    $('budget').innerHTML = BUDGETS
      .map(b => `<button class="bchip${budget === b ? ' on' : ''}" type="button" data-b="${b}"
                  aria-pressed="${budget === b}">${b} min</button>`).join('');
    [...$('budget').children].forEach(btn => btn.addEventListener('click', () => {
      budget = +btn.dataset.b;
      Store.setProfile({ budget });
      current = Engine.rank(Store.completions(), budget)[0] || null;
      pendingOutcome = pendingFriction = null;
      renderBudget();
      renderSlot();
    }));
  }

  $('begin').addEventListener('click', () => {
    $('budget').scrollIntoView({ behavior: 'smooth', block: 'center' });
    ($('budget').firstElementChild || {}).focus && $('budget').firstElementChild.focus();
  });

  function renderSlot(note) {
    const slot = $('slot');
    if (!budget) { slot.innerHTML = ''; return; }

    if (!current) {
      slot.innerHTML = `<div class="task"><p class="brief">Nothing left in that budget today —
        everything that fits is already done. Try a bigger budget, or stop here. Stopping is allowed.</p></div>`;
      return;
    }

    const t = current;
    slot.innerHTML = `<div class="task">
      ${note ? `<p class="toast" style="margin-bottom:11px">${esc(note)} <a href="#/desk">See the desk &rarr;</a></p>` : ''}
      <div class="top">
        <h3>${esc(t.t)}</h3>
        <div class="meta"><span class="tag">${esc(SKILLS[t.s].n)}</span><span class="tag time">${t.m} min</span></div>
      </div>
      <p class="brief">${t.brief}</p>
      <div class="detail">
        <div><b>Why this one</b>${t.why}</div>
        <div><b>Done looks like</b>${t.done}</div>
        <div><b>A strong answer has</b>${t.good}</div>
      </div>
      <div class="row">
        ${t.ex
          ? `<a class="btn primary" href="#/practice/${t.id}">Open it in Practice</a>`
          : `<button class="btn primary" id="finish" type="button">I did this</button>`}
        <button class="btn" id="swap" type="button">Different task</button>
      </div>
      <div id="ci"></div>
    </div>`;

    $('swap').addEventListener('click', () => {
      const alts = Engine.rank(Store.completions(), budget).filter(x => x.id !== current.id);
      current = alts[0] || current;
      pendingOutcome = pendingFriction = null;
      renderSlot();
    });
    if (t.ex) return;
    $('finish').addEventListener('click', () => {
      renderCheckin();
      $('ci').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  }

  /* ── check-in: four taps, writing optional (it isn't) ── */
  function renderCheckin() {
    $('ci').innerHTML = `<div class="checkin">
      <h3>How did it go?</h3>
      <div class="outs">${OUTCOMES.map(([k, l]) =>
        `<button class="out${pendingOutcome === k ? ' on' : ''}" type="button" data-o="${k}"
          aria-pressed="${pendingOutcome === k}"><i></i>${l}</button>`).join('')}</div>
      <p class="hint" style="margin-top:14px">Optional — what slowed you down?</p>
      <div class="frics">${FRICTIONS.map(([k, l]) =>
        `<button class="fric${pendingFriction === k ? ' on' : ''}" type="button" data-f="${k}"
          aria-pressed="${pendingFriction === k}">${l}</button>`).join('')}</div>
      <div class="row"><button class="btn primary" id="save" type="button"${pendingOutcome ? '' : ' disabled'}>Log it</button></div>
    </div>`;

    [...document.querySelectorAll('.out')].forEach(b =>
      b.addEventListener('click', () => { pendingOutcome = b.dataset.o; renderCheckin(); }));
    [...document.querySelectorAll('.fric')].forEach(b =>
      b.addEventListener('click', () => {
        pendingFriction = pendingFriction === b.dataset.f ? null : b.dataset.f;
        renderCheckin();
      }));

    $('save').addEventListener('click', () => {
      if (!pendingOutcome) return;
      Store.addCompletion({
        taskId: current.id,
        date: Engine.today(),
        out: pendingOutcome,
        friction: pendingFriction || null,
        minutes: current.m,
        at: new Date().toISOString()
      });
      const finished = current;
      pendingOutcome = pendingFriction = null;
      current = Engine.rank(Store.completions(), budget).filter(x => x.id !== finished.id)[0] || null;
      renderSlot('Logged — something landed on the desk.');
      renderChrome(true);
    });
  }

  /* ══ PRACTICE ══════════════════════════════════════════
     A real database in the tab. The reference query's output is the
     expected answer, so there is no hand-written key to drift out of
     step with the data. Solving an exercise logs a completion like
     any other task, with the outcome derived from whether help was
     used — and she can correct that in one tap if it is wrong.      */

  const exAll   = () => Store.profile().ex || {};
  const exOf    = id => exAll()[id] || {};
  const exPatch = (id, patch) => {
    const all = { ...exAll() };
    all[id] = { ...(all[id] || {}), ...patch };
    Store.setProfile({ ex: all });
  };
  const exSolved = () => EXERCISES.filter(e => exOf(e.id).solved).length;

  function renderPractice() {
    if (!exId) exId = (EXERCISES.find(e => !exOf(e.id).solved) || EXERCISES[0]).id;

    $('plist').innerHTML = EXERCISES.map((e, i) => {
      const st = exOf(e.id);
      const cls = st.solved ? 'done' : st.tried ? 'tried' : '';
      return `<button class="pitem${e.id === exId ? ' on' : ''}" type="button" data-e="${e.id}"
                aria-current="${e.id === exId}">
        <span class="pdot ${cls}"></span>
        <span class="pnm"><b>${i + 1}.</b> ${esc(e.t)}</span>
        <span class="pmin">${e.m}m</span>
      </button>`;
    }).join('');
    [...$('plist').children].forEach(b => b.addEventListener('click', () => {
      exId = b.dataset.e;
      location.hash = '#/practice/' + exId;
      renderPractice();
    }));

    renderExercise();
  }

  function renderExercise() {
    const e = EXERCISES.find(x => x.id === exId);
    const st = exOf(e.id);

    $('pmain').innerHTML = `
      <div class="pcard">
        <div class="top">
          <h3>${esc(e.t)}</h3>
          <div class="meta"><span class="tag">${esc(SKILLS[e.s].n)}</span><span class="tag time">${e.m} min</span></div>
        </div>
        <p class="ask">${e.ask}</p>
        <p class="shape mono">return: ${e.shape.join(' · ')}${e.ordered ? '  ·  row order matters' : '  ·  any row order'}</p>

        <details class="schema">
          <summary>The database</summary>
          <div class="schemabody">
            ${SCHEMA.map(t => `<div class="stable">
              <b class="mono">${t.t}</b> <span class="hint">${t.n} rows</span>
              <ul>${t.c.map(c => `<li class="mono">${esc(c)}</li>`).join('')}</ul>
            </div>`).join('')}
            <p class="hint">Three markets, four firms in each, eight quarters (2024 Q1 – 2025 Q4), and three dated events.
              Run <code>SELECT * FROM firms</code> any time to look around.</p>
          </div>
        </details>

        <textarea id="editor" class="mono" spellcheck="false" rows="9"
          aria-label="SQL query">${esc(st.sql || '')}</textarea>
        <p class="hint kbd">⌘/Ctrl + Enter runs it.</p>

        <div class="row">
          <button class="btn primary" id="run" type="button">Run</button>
          <button class="btn" id="hint" type="button">${st.hinted ? 'Hint' : 'Hint'}</button>
          <button class="btn" id="sol" type="button">Show solution</button>
          <button class="btn" id="clear" type="button">Clear</button>
        </div>

        <div id="hintbox">${st.hinted ? `<p class="hintbox">${e.hint}</p>` : ''}</div>
        <div id="verdict"></div>
        <div id="out"></div>
        <div id="solbox">${st.shown ? solutionHTML(e) : ''}</div>

        <div class="reslist">
          ${e.res.map(r => r.url
            ? `<a class="res" href="${r.url}" target="_blank" rel="noopener">${esc(r.label)} ↗</a>`
            : `<span class="res flat">${esc(r.label)}</span>`).join('')}
        </div>
      </div>`;

    const ed = $('editor');
    ed.addEventListener('input', () => exPatch(e.id, { sql: ed.value }));
    ed.addEventListener('keydown', ev => {
      if (ev.key === 'Enter' && (ev.metaKey || ev.ctrlKey)) { ev.preventDefault(); run(); }
      if (ev.key === 'Tab') {
        ev.preventDefault();
        const s = ed.selectionStart;
        ed.value = ed.value.slice(0, s) + '  ' + ed.value.slice(ed.selectionEnd);
        ed.selectionStart = ed.selectionEnd = s + 2;
        exPatch(e.id, { sql: ed.value });
      }
    });

    $('run').addEventListener('click', run);
    $('hint').addEventListener('click', () => {
      exPatch(e.id, { hinted: true });
      $('hintbox').innerHTML = `<p class="hintbox">${e.hint}</p>`;
    });
    $('sol').addEventListener('click', () => {
      exPatch(e.id, { shown: true });
      $('solbox').innerHTML = solutionHTML(e);
    });
    $('clear').addEventListener('click', () => {
      ed.value = ''; exPatch(e.id, { sql: '' });
      $('out').innerHTML = ''; $('verdict').innerHTML = '';
    });

    async function run() {
      const sql = ed.value.trim();
      if (!sql) return;
      $('verdict').innerHTML = `<p class="pv wait">Starting the database…</p>`;
      try { await DB.ready(); } catch (err) {
        $('verdict').innerHTML = `<p class="pv bad">The database could not start in this browser. ${esc(String(err))}</p>`;
        return;
      }
      $('verdict').innerHTML = '';

      let actual;
      try { actual = DB.run(sql); }
      catch (err) {
        $('out').innerHTML = '';
        $('verdict').innerHTML = `<p class="pv bad"><b>SQLite says:</b> ${esc(String(err.message || err))}</p>`;
        exPatch(e.id, { tried: true, sql });
        renderPractice2();
        return;
      }

      $('out').innerHTML = grid(actual);
      const expected = DB.run(e.ref);
      const v = DB.compare(expected, actual, e.ordered);
      exPatch(e.id, { tried: true, sql });

      if (!v.ok) {
        $('verdict').innerHTML = `<p class="pv bad">Not yet — ${esc(v.why)}</p>`;
        renderPractice2();
        return;
      }

      const first = !exOf(e.id).solved;
      exPatch(e.id, { solved: true });
      const outcome = exOf(e.id).shown ? 'part' : exOf(e.id).hinted ? 'ref' : 'cold';
      if (first) logExercise(e, outcome);
      $('verdict').innerHTML = `<p class="pv good">Correct — ${expected.rows.length} row${expected.rows.length === 1 ? '' : 's'}, matching.
        ${first ? `Logged as <b>${esc(OUTCOMES.find(o => o[0] === outcome)[1])}</b>
          <button class="linkbtn" id="fix" type="button">change</button>` : 'Already on the desk.'}</p>`;
      if (first) $('fix').addEventListener('click', () => {
        $('verdict').innerHTML = `<div class="outs">${OUTCOMES.map(([k, l]) =>
          `<button class="out${k === outcome ? ' on' : ''}" type="button" data-o="${k}"><i></i>${l}</button>`).join('')}</div>`;
        [...document.querySelectorAll('#verdict .out')].forEach(b => b.addEventListener('click', () => {
          const comps = Store.completions();
          for (let i = comps.length - 1; i >= 0; i--)
            if (comps[i].taskId === e.id) { comps[i].out = b.dataset.o; break; }
          Store.setProfile({});           // forces a save of the mutated store
          $('verdict').innerHTML = `<p class="pv good">Logged as <b>${esc(OUTCOMES.find(o => o[0] === b.dataset.o)[1])}</b>.</p>`;
          renderChrome(true);
        }));
      });
      if (!exOf(e.id).shown) $('solbox').innerHTML = solutionHTML(e, true);
      renderPractice2();
      renderChrome(true);
    }
  }

  /** Redraw only the list, so running a query does not rebuild the editor. */
  function renderPractice2() {
    const host = $('plist');
    [...host.children].forEach(b => {
      const st = exOf(b.dataset.e);
      const dot = b.querySelector('.pdot');
      dot.className = 'pdot ' + (st.solved ? 'done' : st.tried ? 'tried' : '');
    });
    $('nav-p').textContent = exSolved() + '/' + EXERCISES.length;
  }

  function solutionHTML(e, earned) {
    return `<div class="sol">
      <b class="lbl">${earned ? 'One way to write it' : 'Solution'}</b>
      <pre class="mono">${esc(e.ref)}</pre>
      <div class="solnotes">${e.notes}</div>
    </div>`;
  }

  /** A solved exercise is a finished task: it lands on the desk and moves the track. */
  function logExercise(e, outcome) {
    Store.addCompletion({
      taskId: e.id,
      date: Engine.today(),
      out: outcome,
      friction: null,
      minutes: e.m,
      at: new Date().toISOString()
    });
  }

  /* ══ DESK ══════════════════════════════════════════════ */
  function renderFilters() {
    const comps = Store.completions();
    const present = new Set(comps.map(c => (Engine.taskById(c.taskId) || {}).s).filter(Boolean));
    const opts = [['all', 'Everything'], ['pin', 'Showable']]
      .concat(Object.entries(SKILLS).filter(([k]) => present.has(k)).map(([k, s]) => [k, s.n]));

    $('desk-filters').innerHTML = opts.map(([k, l]) =>
      `<button class="fchip${deskFilter === k ? ' on' : ''}" type="button" data-k="${k}"
        aria-pressed="${deskFilter === k}">${esc(l)}</button>`).join('');
    [...$('desk-filters').children].forEach(b => b.addEventListener('click', () => {
      deskFilter = b.dataset.k; renderDesk();
    }));
  }

  function renderDesk() {
    const comps = Store.completions();
    const host = $('desk');
    $('desk-filters').hidden = !comps.length;

    if (!comps.length) {
      host.innerHTML = `<p class="empty">Nothing here yet. Finish one task and the first artifact lands —
        a printout, a query, a rebuilt statement. This is the part you can point at.
        <br><br><a class="btn primary" href="#/today">Start with a budget</a></p>`;
      return;
    }
    renderFilters();

    const pinned = c => SHOWABLE.has(c.taskId) && (c.out === 'cold' || c.out === 'ref');
    const items = [...comps]
      .sort((a, b) => (b.at || '').localeCompare(a.at || ''))
      .filter(c => {
        if (deskFilter === 'all') return true;
        if (deskFilter === 'pin') return pinned(c);
        const t = Engine.taskById(c.taskId);
        return t && t.s === deskFilter;
      })
      .slice(0, 48);

    if (!items.length) {
      host.innerHTML = `<p class="empty">Nothing on the desk matches that filter yet.</p>`;
      return;
    }

    host.innerHTML = '<div class="deskgrid">' + items.map((c, i) => {
      const t = Engine.taskById(c.taskId);
      if (!t) return '';
      const colour = c.out === 'cold' ? 'var(--cold)'
                   : c.out === 'ref'  ? 'var(--ref)'
                   : c.out === 'part' ? 'var(--part)' : 'var(--stuck)';
      return `<div class="art" style="animation-delay:${Math.min(i, 11) * 32}ms">
        ${pinned(c) ? '<span class="pin" title="Showable to an employer"></span>' : ''}
        <span style="color:${colour}">${GLYPHS[SKILLS[t.s].art]}</span>
        <span class="nm">${esc(t.t)}</span>
        <span class="dt">${esc(c.date)}</span>
      </div>`;
    }).join('') + '</div>';
  }

  /* ══ TRACKS ════════════════════════════════════════════ */
  function renderTracks() {
    const st = Engine.stats(Store.completions());
    $('tracks').innerHTML = Object.entries(SKILLS).map(([key, skill]) => {
      const s = st[key];
      const [label, cls] = Engine.trackState(s);
      const width = 100 / Math.max(8, s.outcomes.length);
      const segs = s.outcomes.slice(-20).map(o => {
        const c = o === 'cold' ? 'c' : o === 'ref' ? 'r' : o === 'part' ? 'p' : 's';
        return `<i class="${c}" style="width:${width}%"></i>`;
      }).join('');
      const top = Object.entries(s.friction).sort((a, b) => b[1] - a[1])[0];
      const FR = { concept: 'the concept', syntax: 'syntax', debug: 'debugging', explain: 'explaining the result' };

      return `<div class="track">
        <div class="thead">
          <span class="tname">${esc(skill.n)}</span>
          <span style="display:flex;gap:11px;align-items:center">
            <span class="tn">${s.n ? s.n + ' finished · ' + s.cold + ' cold' : 'nothing yet'}</span>
            <span class="state ${cls}">${label}</span>
          </span>
        </div>
        <span class="bar">${segs}</span>
        <p class="treq${cls === 'review' ? ' flag' : ''}">${esc(Engine.requirement(s))}${
          top ? ` <span style="color:var(--muted)">· most often slowed by ${esc(FR[top[0]] || top[0])}.</span>` : ''
        }</p>
      </div>`;
    }).join('');
  }

  /* ══ persistent chrome: nav count, streak, footer ══════ */
  function renderChrome(bump) {
    const comps = Store.completions();
    const n = Engine.streak(comps);

    $('nav-n').textContent = comps.length;
    $('nav-p').textContent = exSolved() + '/' + EXERCISES.length;
    if (bump) { $('nav-n').classList.remove('bump'); void $('nav-n').offsetWidth; $('nav-n').classList.add('bump'); }

    $('streakpill').textContent = n === 0 ? 'no streak yet'
                                : n === 1 ? '1 day showing up'
                                          : n + ' days showing up';

    const st = Engine.stats(comps);
    const review = Object.entries(st)
      .filter(([, s]) => Engine.trackState(s)[1] === 'review')
      .map(([k]) => SKILLS[k].n);

    $('budget-hint').innerHTML = review.length
      ? `One task that fits. <strong style="color:var(--stuck)">${esc(review[0])}</strong> is flagged for review — you'll be steered there.`
      : 'Pick a budget and you\'ll get one task that fits it.';

    const hero = $('hero');
    hero.classList.toggle('compact', comps.length > 0);
    if (comps.length) $('lede').textContent = '';

    const cold = comps.filter(c => c.out === 'cold').length;
    $('foot').innerHTML = `<strong>${comps.length}</strong> task${comps.length === 1 ? '' : 's'} finished · ${cold} cold.
      A streak only measures showing up — it is not evidence of skill.
      The desk and the track states are; both move only when work is finished.`;
  }

  /* ══ data controls ═════════════════════════════════════ */
  function say(msg) {
    $('data-toast').textContent = msg;
    setTimeout(() => { $('data-toast').textContent = ''; }, 5000);
  }

  $('export').addEventListener('click', () => { Store.exportFile(); say('Exported.'); });

  $('import-file').addEventListener('change', async e => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    try {
      const added = await Store.importFile(file);
      renderChrome(true); renderDesk(); renderTracks();
      say(added ? `Imported — ${added} new entr${added === 1 ? 'y' : 'ies'}.` : 'Imported — nothing new in that file.');
    } catch (err) {
      say('That file was not a Desk export.');
    }
    e.target.value = '';
  });

  $('reset').addEventListener('click', () => {
    if (!confirm('Erase every logged task on this browser? Export first if you want a copy — this cannot be undone.')) return;
    Store.reset();
    budget = null; current = null; deskFilter = 'all';
    renderBudget(); renderSlot(); renderChrome(); renderDesk(); renderTracks();
    say('Erased.');
  });

  /* ══ boot ══════════════════════════════════════════════ */
  Store.load();
  applyTheme(Store.profile().theme);
  const saved = Store.profile().budget;
  if (saved && BUDGETS.includes(saved)) {
    budget = saved;
    current = Engine.rank(Store.completions(), budget)[0] || null;
  }
  renderBudget();
  renderSlot();
  renderChrome();
  window.addEventListener('hashchange', route);
  route();
})();
