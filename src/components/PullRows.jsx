import React from 'react';
import { CountUp } from './CountUp.jsx';
import { formatMoney } from '../utils/money.js';

export function PullRows({ dropDetails }) {
  if (!dropDetails.length) return null;

  return (
    <>
      {dropDetails.map((item) => (
        <div key={item.label} className="pull-row">
          <div className="pull-row-left">
            <div className="pull-count">{item.count}</div>
            <span className="pull-times">×</span>
            <span className="pull-denom">{item.label}</span>
          </div>
          <span className="pull-value">
            <CountUp key={`pull-${item.label}`} value={item.value} format={formatMoney} />
          </span>
        </div>
      ))}
    </>
  );
}
