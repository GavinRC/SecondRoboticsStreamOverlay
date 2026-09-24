'use client';

import React from 'react';

interface FuelGaugeProps {
  /** Current fuel count for this alliance */
  value: number;
  /** Fuel counts that earn an RP, e.g. [100] or [100, 360]. Gauge fills toward the next unearned one. */
  thresholds?: number[];
  /** Tile background (use the alliance color) */
  backgroundColor: string;
  /** Rendered height in px; width follows the tile's aspect ratio */
  height?: number;
  label?: string;
}

// Geometry (viewBox units)
const VB_W = 100;
const VB_H = 118;
const CX = 50;
const CY = 48;
const R = 34;
const STROKE = 8;
const START_DEG = 135; // bottom-left (screen coords, clockwise from 3 o'clock)
const SWEEP_DEG = 270; // leaves a gap at the bottom like the reference

const polar = (deg: number) => {
  const rad = (deg * Math.PI) / 180;
  return { x: CX + R * Math.cos(rad), y: CY + R * Math.sin(rad) };
};

const start = polar(START_DEG);
const end = polar(START_DEG + SWEEP_DEG);
const ARC_PATH = `M ${start.x} ${start.y} A ${R} ${R} 0 1 1 ${end.x} ${end.y}`;

export default function FuelGauge({
  value,
  thresholds = [100],
  backgroundColor,
  height = 110,
  label = 'FUEL',
}: FuelGaugeProps) {
  const safeValue = Math.max(0, Math.round(value || 0));
  const sorted = [...thresholds].filter((t) => t > 0).sort((a, b) => a - b);

  const earned = sorted.filter((t) => safeValue >= t).length;
  const next = sorted[earned];
  const prev = earned > 0 ? sorted[earned - 1] : 0;
  const progress =
    next === undefined ? 1 : Math.min(1, Math.max(0, (safeValue - prev) / (next - prev)));

  // pathLength=100 lets dashoffset be a simple percentage
  const dashOffset = 100 - progress * 100;

  // RP pips sit in the gap under the arc (only shown when there's more than one RP to earn)
  const pipGap = 7;
  const pipStartX = CX - ((sorted.length - 1) * pipGap) / 2;

  return (
    <div
      style={{
        backgroundColor,
        height,
        width: (height * VB_W) / VB_H,
        flexShrink: 0,
        transition: 'background-color 300ms ease',
      }}
    >
      <svg
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        width="100%"
        height="100%"
        role="img"
        aria-label={`${label}: ${safeValue}`}
      >
        {/* Track */}
        <path
          d={ARC_PATH}
          fill="none"
          stroke="rgba(0, 0, 0, 0.28)"
          strokeWidth={STROKE}
          strokeLinecap="round"
        />

        {/* Progress */}
        <path
          d={ARC_PATH}
          fill="none"
          stroke="#ffffff"
          strokeWidth={STROKE}
          strokeLinecap="round"
          pathLength={100}
          strokeDasharray="100 100"
          strokeDashoffset={dashOffset}
          opacity={progress > 0 ? 1 : 0}
          style={{ transition: 'stroke-dashoffset 400ms ease-out' }}
        />

        {/* Fuel count */}
        <text
          x={CX}
          y={CY + 1}
          textAnchor="middle"
          dominantBaseline="central"
          fill="#ffffff"
          fontSize={safeValue >= 1000 ? 20 : 26}
          fontWeight={800}
          fontFamily="inherit"
        >
          {safeValue}
        </text>

        {/* RP pips */}
        {sorted.length > 1 &&
          sorted.map((t, i) => (
            <circle
              key={t}
              cx={pipStartX + i * pipGap}
              cy={CY + R + 2}
              r={2.4}
              fill={i < earned ? '#ffffff' : 'rgba(0, 0, 0, 0.28)'}
            />
          ))}

        {/* Label */}
        <text
          x={CX}
          y={108}
          textAnchor="middle"
          fill="rgba(255, 255, 255, 0.9)"
          fontSize={11}
          fontWeight={700}
          letterSpacing={1.5}
          fontFamily="inherit"
        >
          {label}
        </text>
      </svg>
    </div>
  );
}
