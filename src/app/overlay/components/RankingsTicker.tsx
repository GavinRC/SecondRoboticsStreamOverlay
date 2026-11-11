"use client";

import { Fragment, memo, useEffect, useState } from "react";
import Image from "next/image";

interface RankingEntry {
  rank: number;
  name: string;
  rp?: string;
  wins?: string;
  losses?: string;
  ties?: string;
}

export const RANKINGS_TICKER_HEIGHT = 64;

const REFRESH_MS = 30_000;       // how often to re-pull the sheet
const SECONDS_PER_ENTRY = 5;     // scroll speed: one full loop = entries × this
const ACCENT = '#ef4444';        // red "RANKINGS" tab / rank numbers / stats

function formatDate(d: Date) {
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).toUpperCase();
}

// Memoized: MatchView re-renders on every fast score poll; the ticker has no props,
// so this keeps those re-renders from touching the scrolling element at all.
export default memo(RankingsTicker);

function RankingsTicker() {
  const [rankings, setRankings] = useState<RankingEntry[]>([]);
  const [date, setDate] = useState('');

  // ─── Pull rankings from the sheet ───────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch('/api/rankings', { cache: 'no-store' });
        const data = await res.json();
        if (!cancelled && Array.isArray(data.rankings)) {
          // Only swap the list when it actually changed, so the scroll doesn't restart
          setRankings(prev => JSON.stringify(prev) === JSON.stringify(data.rankings) ? prev : data.rankings);
        }
      } catch {
        // keep showing what we have
      }
    };
    load();
    const interval = setInterval(load, REFRESH_MS);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  useEffect(() => {
    const tick = () => setDate(formatDate(new Date()));
    tick();
    const interval = setInterval(tick, 60_000);
    return () => clearInterval(interval);
  }, []);

  const hasRankings = rankings.length > 0;
  const loopSeconds = Math.max(40, rankings.length * SECONDS_PER_ENTRY);

  // One copy of the list; rendered twice back-to-back for a seamless loop
  const renderList = (copy: number) => (
    <div className="flex items-center shrink-0" aria-hidden={copy === 1}>
      {rankings.map(entry => (
        <Fragment key={`${copy}-${entry.rank}`}>
          <div className="flex items-baseline gap-2 px-6 whitespace-nowrap">
            <span className="font-mono font-bold text-xl" style={{ color: ACCENT }}>#{entry.rank}</span>
            <span className="text-2xl font-semibold text-white">{entry.name}</span>
            {entry.wins !== undefined && (
              <>
                <span className="text-xs font-bold text-white/50 ml-2">W-L-T</span>
                <span className="font-mono font-bold text-xl" style={{ color: ACCENT }}>
                  {entry.wins}-{entry.losses ?? 0}-{entry.ties ?? 0}
                </span>
              </>
            )}
            {entry.rp !== undefined && (
              <>
                <span className="text-xs font-bold text-white/50 ml-2">RP</span>
                <span className="font-mono font-bold text-xl" style={{ color: ACCENT }}>{entry.rp}</span>
              </>
            )}
          </div>
          <span className="text-lg" style={{ color: ACCENT }}>◆</span>
        </Fragment>
      ))}
    </div>
  );

  return (
    <div
      className="absolute left-0 right-0 bottom-0 flex items-stretch bg-gray-950/90 border-t border-white/20"
      style={{ height: RANKINGS_TICKER_HEIGHT }}
    >
      {/* Logo block */}
      <div className="flex items-center px-4 bg-gray-950 z-10">
        <div className="relative w-12 h-12">
          <Image src="/assets/fun.png" alt="Logo" fill style={{ objectFit: 'contain' }} />
        </div>
      </div>

      {/* Slanted RANKINGS tab */}
      <div
        className="flex items-center pl-6 pr-10 z-10 -ml-1"
        style={{ background: ACCENT, clipPath: 'polygon(16px 0, 100% 0, calc(100% - 16px) 100%, 0 100%)' }}
      >
        <span className="text-lg font-extrabold tracking-[0.3em] text-white">RANKINGS</span>
      </div>

      {/* Scrolling ranks */}
      <div className="relative flex-1 overflow-hidden flex items-center">
        {hasRankings ? (
          <div className="flex rankings-marquee" style={{ animationDuration: `${loopSeconds}s` }}>
            {renderList(0)}
            {renderList(1)}
          </div>
        ) : (
          <span className="px-6 text-xl font-semibold text-white/60 whitespace-nowrap">
            Rankings will appear here once players are added
          </span>
        )}
      </div>

      {/* Date */}
      <div className="flex items-center px-5 bg-gray-950 z-10 border-l border-white/15">
        <span className="text-sm font-bold tracking-widest text-white/80">{date}</span>
      </div>

      <style jsx>{`
        /* translate3d keeps the scroll on the GPU compositor so it never waits on layout/paint */
        @keyframes rankings-scroll {
          from { transform: translate3d(0, 0, 0); }
          to   { transform: translate3d(-50%, 0, 0); }
        }
        .rankings-marquee {
          animation-name: rankings-scroll;
          animation-timing-function: linear;
          animation-iteration-count: infinite;
          will-change: transform;
          backface-visibility: hidden;
          width: max-content;
        }
      `}</style>
    </div>
  );
}
