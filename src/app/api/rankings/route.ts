import { NextResponse } from 'next/server';

// ─── Rankings source ───────────────────────────────────────────────────────────
// Google Sheet "Ranks" tab. Row 1 is the header (Rank, PLAYER, RP, WINS, LOSSES, TIES, ...);
// player names start at B2 (rank 1) and go down.
// The sheet must be shared as "Anyone with the link → Viewer" for this to work.
const SHEET_ID = process.env.RANKINGS_SHEET_ID || '1b9ijO_WfV6W92FtaVC3hZwGYEyG2bHZRsTpD-G6GqKY';
const SHEET_TAB = process.env.RANKINGS_SHEET_TAB || 'Ranks';
const CACHE_MS = 30_000;

// Fixed column positions on the Ranks tab (0 = column A)
const COL = {
  PLAYER: 1, // B
  RP: 2,     // C — total RP
  WINS: 3,   // D
  LOSSES: 4, // E
  TIES: 5,   // F
} as const;

interface RankingEntry {
  rank: number;
  name: string;
  rp?: string;
  wins?: string;
  losses?: string;
  ties?: string;
}

let cache: { at: number; rankings: RankingEntry[] } | null = null;

// Minimal RFC 4180 CSV parser (handles quoted fields, escaped quotes and commas)
function parseCsv(csv: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < csv.length; i++) {
    const c = csv[i];
    if (inQuotes) {
      if (c === '"' && csv[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') inQuotes = false;
      else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && csv[i + 1] === '\n') i++;
      row.push(field); rows.push(row); row = []; field = '';
    } else field += c;
  }
  if (field !== '' || row.length > 0) { row.push(field); rows.push(row); }
  return rows;
}

export async function GET() {
  if (cache && Date.now() - cache.at < CACHE_MS) {
    return NextResponse.json({ rankings: cache.rankings, cached: true });
  }

  const url =
    `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv` +
    `&sheet=${encodeURIComponent(SHEET_TAB)}`;

  try {
    const res = await fetch(url, { cache: 'no-store' });
    const body = await res.text();

    // A private sheet answers with a Google sign-in HTML page instead of CSV
    if (!res.ok || body.trimStart().startsWith('<')) {
      throw new Error('Rankings sheet is not publicly readable. Share it as "Anyone with the link can view".');
    }

    // Skip the header row; data starts on row 2
    const [, ...rows] = parseCsv(body);
    const cell = (r: string[], i: number) => (r[i] ?? '').trim() || undefined;

    const rankings: RankingEntry[] = [];
    for (const r of rows) {
      const name = (r[COL.PLAYER] ?? '').trim();
      if (!name) break; // stop at the first blank player cell
      rankings.push({
        rank: rankings.length + 1,
        name,
        rp: cell(r, COL.RP),
        wins: cell(r, COL.WINS),
        losses: cell(r, COL.LOSSES),
        ties: cell(r, COL.TIES),
      });
    }

    cache = { at: Date.now(), rankings };
    return NextResponse.json({ rankings });
  } catch (error) {
    console.error('Error fetching rankings sheet:', error);
    // Keep serving the last good copy so the ticker doesn't blank out
    if (cache) {
      return NextResponse.json({ rankings: cache.rankings, stale: true });
    }
    return NextResponse.json(
      { rankings: [], error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 502 }
    );
  }
}
