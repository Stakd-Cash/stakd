import React from 'react';
import { CHART_ZOOM } from './chartConstants.js';

/**
 * Segmented chart zoom control with sliding highlight (squircle).
 * Independent instances can be used for line vs bar charts.
 */
export function ChartZoomToolbar({
  value,
  onChange,
  className = '',
  ariaLabel = 'Chart zoom within loaded range',
  title: titleAttr,
}) {
  const activeIndex = Math.max(0, CHART_ZOOM.findIndex((z) => z.key === value));
  const n = CHART_ZOOM.length;

  return (
    <div
      className={`ap-chart-zoom-toolbar ${className}`.trim()}
      style={{ '--ap-tf-index': activeIndex, '--ap-tf-n': n }}
      role="toolbar"
      aria-label={ariaLabel}
      title={titleAttr}
    >
      <div className="ap-chart-zoom-toolbar__glider" aria-hidden />
      {CHART_ZOOM.map(({ key, label }) => (
        <button
          key={key}
          type="button"
          className={`ap-chart-zoom-toolbar__btn${value === key ? ' is-active' : ''}`}
          onClick={() => onChange(key)}
          aria-pressed={value === key}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
