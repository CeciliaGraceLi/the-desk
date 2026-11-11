/* ============================================================
   db.js — the practice database and the SQL runner.

   A real SQLite database, compiled to WebAssembly (sql.js), running
   in this tab. Nothing is sent anywhere; the database is rebuilt from
   the seed below on every page load, so you cannot break it.

   The data is invented but shaped like a market-definition exhibit:
   three markets, four firms in each, eight quarters of revenue, and
   a few dated events to anchor a before/after.
   ============================================================ */

const SEED_SQL = String.raw`
CREATE TABLE markets (
  market_id   INTEGER PRIMARY KEY,
  market_name TEXT NOT NULL
);
CREATE TABLE firms (
  firm_id   INTEGER PRIMARY KEY,
  firm_name TEXT NOT NULL,
  market_id INTEGER NOT NULL REFERENCES markets(market_id),
  hq_state  TEXT NOT NULL
);
CREATE TABLE quarterly_revenue (
  firm_id        INTEGER NOT NULL REFERENCES firms(firm_id),
  year           INTEGER NOT NULL,
  quarter        INTEGER NOT NULL,
  quarter_start  TEXT    NOT NULL,
  revenue_usd_m  REAL    NOT NULL,
  PRIMARY KEY (firm_id, year, quarter)
);
CREATE TABLE events (
  event_id   INTEGER PRIMARY KEY,
  market_id  INTEGER NOT NULL REFERENCES markets(market_id),
  event_date TEXT NOT NULL,
  event_type TEXT NOT NULL,
  detail     TEXT NOT NULL
);

INSERT INTO markets VALUES
  (1, 'Retail pharmacy'),
  (2, 'Regional airlines'),
  (3, 'Grocery delivery');

INSERT INTO firms VALUES
  (1, 'Alder Drug', 1, 'MA'),
  (2, 'Brightwell Pharmacy', 1, 'NY'),
  (3, 'Capstone Rx', 1, 'CT'),
  (4, 'Dover Health Mart', 1, 'RI'),
  (5, 'Northline Air', 2, 'MA'),
  (6, 'Pinnacle Regional', 2, 'NH'),
  (7, 'Quill Airways', 2, 'ME'),
  (8, 'Rowan Air', 2, 'VT'),
  (9, 'Summit Fresh', 3, 'MA'),
  (10, 'Tidewater Grocers', 3, 'CT'),
  (11, 'Umbra Market', 3, 'NY'),
  (12, 'Vesta Delivery', 3, 'NJ');

INSERT INTO quarterly_revenue VALUES
  (1, 2024, 1, '2024-01-01', 795.4),
  (1, 2024, 2, '2024-04-01', 846.4),
  (1, 2024, 3, '2024-07-01', 881.8),
  (1, 2024, 4, '2024-10-01', 841.4),
  (1, 2025, 1, '2025-01-01', 834.3),
  (1, 2025, 2, '2025-04-01', 887.8),
  (1, 2025, 3, '2025-07-01', 924.9),
  (1, 2025, 4, '2025-10-01', 882.5),
  (2, 2024, 1, '2024-01-01', 523.8),
  (2, 2024, 2, '2024-04-01', 562.4),
  (2, 2024, 3, '2024-07-01', 591.1),
  (2, 2024, 4, '2024-10-01', 569.0),
  (2, 2025, 1, '2025-01-01', 569.2),
  (2, 2025, 2, '2025-04-01', 611.1),
  (2, 2025, 3, '2025-07-01', 642.3),
  (2, 2025, 4, '2025-10-01', 618.3),
  (3, 2024, 1, '2024-01-01', 300.7),
  (3, 2024, 2, '2024-04-01', 327.0),
  (3, 2024, 3, '2024-07-01', 348.0),
  (3, 2024, 4, '2024-10-01', 339.3),
  (3, 2025, 1, '2025-01-01', 343.7),
  (3, 2025, 2, '2025-04-01', 373.7),
  (3, 2025, 3, '2025-07-01', 397.8),
  (3, 2025, 4, '2025-10-01', 387.8),
  (4, 2024, 1, '2024-01-01', 126.1),
  (4, 2024, 2, '2024-04-01', 130.2),
  (4, 2024, 3, '2024-07-01', 131.6),
  (4, 2024, 4, '2024-10-01', 121.9),
  (4, 2025, 1, '2025-01-01', 117.3),
  (4, 2025, 2, '2025-04-01', 121.1),
  (4, 2025, 3, '2025-07-01', 122.4),
  (4, 2025, 4, '2025-10-01', 113.3),
  (5, 2024, 1, '2024-01-01', 397.7),
  (5, 2024, 2, '2024-04-01', 422.0),
  (5, 2024, 3, '2024-07-01', 438.3),
  (5, 2024, 4, '2024-10-01', 417.0),
  (5, 2025, 1, '2025-01-01', 412.2),
  (5, 2025, 2, '2025-04-01', 437.4),
  (5, 2025, 3, '2025-07-01', 454.3),
  (5, 2025, 4, '2025-10-01', 432.2),
  (6, 2024, 1, '2024-01-01', 378.3),
  (6, 2024, 2, '2024-04-01', 403.8),
  (6, 2024, 3, '2024-07-01', 421.9),
  (6, 2024, 4, '2024-10-01', 403.7),
  (6, 2025, 1, '2025-01-01', 401.5),
  (6, 2025, 2, '2025-04-01', 428.5),
  (6, 2025, 3, '2025-07-01', 447.8),
  (6, 2025, 4, '2025-10-01', 428.5),
  (7, 2024, 1, '2024-01-01', 252.2),
  (7, 2024, 2, '2024-04-01', 272.6),
  (7, 2024, 3, '2024-07-01', 288.5),
  (7, 2024, 4, '2024-10-01', 279.6),
  (7, 2025, 1, '2025-01-01', 281.7),
  (7, 2025, 2, '2025-04-01', 304.5),
  (7, 2025, 3, '2025-07-01', 322.2),
  (7, 2025, 4, '2025-10-01', 312.3),
  (8, 2024, 1, '2024-01-01', 184.3),
  (8, 2024, 2, '2024-04-01', 192.6),
  (8, 2024, 3, '2024-07-01', 197.1),
  (8, 2024, 4, '2024-10-01', 184.7),
  (8, 2025, 1, '2025-01-01', 179.9),
  (8, 2025, 2, '2025-04-01', 188.1),
  (8, 2025, 3, '2025-07-01', 192.4),
  (8, 2025, 4, '2025-10-01', 180.3),
  (9, 2024, 1, '2024-01-01', 291.0),
  (9, 2024, 2, '2024-04-01', 318.2),
  (9, 2024, 3, '2024-07-01', 340.7),
  (9, 2024, 4, '2024-10-01', 334.1),
  (9, 2025, 1, '2025-01-01', 340.4),
  (9, 2025, 2, '2025-04-01', 372.3),
  (9, 2025, 3, '2025-07-01', 398.6),
  (9, 2025, 4, '2025-10-01', 390.8),
  (10, 2024, 1, '2024-01-01', 271.6),
  (10, 2024, 2, '2024-04-01', 288.7),
  (10, 2024, 3, '2024-07-01', 300.5),
  (10, 2024, 4, '2024-10-01', 286.4),
  (10, 2025, 1, '2025-01-01', 283.7),
  (10, 2025, 2, '2025-04-01', 301.7),
  (10, 2025, 3, '2025-07-01', 313.9),
  (10, 2025, 4, '2025-10-01', 299.3),
  (11, 2024, 1, '2024-01-01', 242.5),
  (11, 2024, 2, '2024-04-01', 259.8),
  (11, 2024, 3, '2024-07-01', 272.6),
  (11, 2024, 4, '2024-10-01', 261.9),
  (11, 2025, 1, '2025-01-01', 261.5),
  (11, 2025, 2, '2025-04-01', 280.2),
  (11, 2025, 3, '2025-07-01', 293.9),
  (11, 2025, 4, '2025-10-01', 282.4),
  (12, 2024, 1, '2024-01-01', 223.1),
  (12, 2024, 2, '2024-04-01', 240.5),
  (12, 2024, 3, '2024-07-01', 253.7),
  (12, 2024, 4, '2024-10-01', 245.2),
  (12, 2025, 1, '2025-01-01', 246.3),
  (12, 2025, 2, '2025-04-01', 265.4),
  (12, 2025, 3, '2025-07-01', 280.1),
  (12, 2025, 4, '2025-10-01', 270.7);

INSERT INTO events VALUES
  (1, 2, '2025-01-15', 'merger_announced', 'Quill Airways announces acquisition of Rowan Air'),
  (2, 1, '2024-09-02', 'entry',            'Dover Health Mart enters the Boston metro'),
  (3, 3, '2025-07-21', 'price_war',        'Summit Fresh cuts delivery fees market-wide');`;

const DB = (function () {
  let db = null;
  let loading = null;

  /** Load the wasm once, then build the database from SEED_SQL. */
  function ready() {
    if (db) return Promise.resolve(db);
    if (loading) return loading;
    loading = initSqlJs({ locateFile: f => 'vendor/sql.js/' + f })
      .then(SQL => { db = new SQL.Database(); db.run(SEED_SQL); return db; });
    return loading;
  }

  /** Run one statement. Returns { cols, rows } or throws with SQLite's message. */
  function run(sql) {
    const res = db.exec(sql);
    if (!res.length) return { cols: [], rows: [] };
    const last = res[res.length - 1];
    return { cols: last.columns, rows: last.values };
  }

  /* ── comparison ──────────────────────────────────────────
     Column *names* are ignored: naming a column `share` instead of
     `share_pct` is not a wrong answer. Shape and values are not.
     Numbers compare within a tolerance, because 31.900000000000002
     and 31.9 are the same answer.                               */

  const EPS = 0.051;

  function sameCell(a, b) {
    if (a === null || a === undefined) return b === null || b === undefined;
    if (b === null || b === undefined) return false;
    const na = Number(a), nb = Number(b);
    if (Number.isFinite(na) && Number.isFinite(nb) && a !== '' && b !== '')
      return Math.abs(na - nb) <= EPS;
    return String(a).trim() === String(b).trim();
  }

  const key = row => row.map(c => (c === null ? '\u0000' : String(c))).join('\u0001');

  function compare(expected, actual, ordered) {
    if (!actual.rows.length && expected.rows.length)
      return { ok: false, why: 'The query ran but returned no rows.' };
    if (actual.cols.length !== expected.cols.length)
      return { ok: false, why: `Expected ${expected.cols.length} column${expected.cols.length === 1 ? '' : 's'}, got ${actual.cols.length}.` };
    if (actual.rows.length !== expected.rows.length)
      return { ok: false, why: `Expected ${expected.rows.length} row${expected.rows.length === 1 ? '' : 's'}, got ${actual.rows.length}.` };

    let E = expected.rows, A = actual.rows;
    if (!ordered) { E = [...E].sort((x, y) => key(x).localeCompare(key(y)));
                    A = [...A].sort((x, y) => key(x).localeCompare(key(y))); }

    for (let i = 0; i < E.length; i++)
      for (let j = 0; j < E[i].length; j++)
        if (!sameCell(E[i][j], A[i][j]))
          return { ok: false,
                   why: `Row ${i + 1}, column ${j + 1}: expected ${fmt(E[i][j])}, got ${fmt(A[i][j])}.`,
                   row: i };
    return { ok: true };
  }

  const fmt = v => v === null ? 'NULL' : typeof v === 'number' ? String(v) : `"${v}"`;

  return { ready, run, compare };
})();
