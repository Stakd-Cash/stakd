import React, { useRef } from 'react';

let sparkSeq = 0;

const defaultFillGradient = {
  stopColor: 'var(--chart-blue)',
  startOpacity: 0.18,
  endOpacity: 0,
};

export function Sparkline({
  data,
  stroke = ['var(--brand)', 'var(--green)'],
  fillGradient = defaultFillGradient,
}) {
  if (!data || data.length < 2) return null;

  const idRef = useRef(++sparkSeq);
  const strokeId = `spark-stroke-${idRef.current}`;
  const fillId = `spark-fill-${idRef.current}`;
  const glowId = `spark-glow-${idRef.current}`;
  const clipId = `spark-clip-${idRef.current}`;

  const W = 200;
  const H = 56;
  const PAD = 4;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const pts = data.map((d, i) => {
    const x = PAD + (i / (data.length - 1)) * (W - PAD * 2);
    const y = PAD + (1 - (d - min) / range) * (H - PAD * 2);
    return [x, y];
  });

  const buildPath = (ps) => {
    if (ps.length < 2) return '';
    let d = `M${ps[0][0]},${ps[0][1]}`;
    for (let i = 1; i < ps.length; i++) {
      const [x0, y0] = ps[i - 1];
      const [x1, y1] = ps[i];
      const cx = (x0 + x1) / 2;
      d += ` C${cx},${y0} ${cx},${y1} ${x1},${y1}`;
    }
    return d;
  };

  const linePath = buildPath(pts);
  const last = pts[pts.length - 1];
  const fillPath = `${linePath} L${last[0]},${H} L${pts[0][0]},${H} Z`;

  return (
    <svg
      className="sparkline"
      viewBox={`0 0 ${W} ${H}`}
      style={{ color: stroke[1], overflow: 'visible' }}
    >
      <defs>
        <linearGradient
          id={strokeId}
          x1="0"
          y1="0"
          x2="1"
          y2="0"
          gradientUnits="objectBoundingBox"
        >
          <stop offset="0%" stopColor={stroke[0]} />
          <stop offset="100%" stopColor={stroke[1]} />
        </linearGradient>
        <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
          <stop
            offset="0%"
            style={{
              stopColor: fillGradient.stopColor,
              stopOpacity: fillGradient.startOpacity,
            }}
          />
          <stop
            offset="100%"
            style={{
              stopColor: fillGradient.stopColor,
              stopOpacity: fillGradient.endOpacity,
            }}
          />
        </linearGradient>
        <radialGradient id={glowId}>
          <stop offset="0%" stopColor={stroke[1]} stopOpacity="0.55" />
          <stop offset="100%" stopColor={stroke[1]} stopOpacity="0" />
        </radialGradient>
        <clipPath id={clipId}>
          <rect x="0" y="0" width={W} height={H} />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clipId})`}>
        <path d={fillPath} fill={`url(#${fillId})`} stroke="none" />
        <path
          d={linePath}
          fill="none"
          stroke={`url(#${strokeId})`}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
      <circle
        cx={last[0]}
        cy={last[1]}
        r="10"
        fill={`url(#${glowId})`}
      />
      <circle
        cx={last[0]}
        cy={last[1]}
        r="3.2"
        fill={stroke[1]}
        className="sparkline-dot"
      />
    </svg>
  );
}
