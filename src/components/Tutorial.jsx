import React, { useState, useEffect, useRef } from 'react';
import { haptic } from '../utils/haptics.js';
import { TUT_STEPS } from '../utils/constants.js';

const SPAD = 10;

export function Tutorial({ onDone }) {
  const [step, setStep] = useState(0);
  const [spot, setSpot] = useState(null);
  const [bot, setBot] = useState(120);
  const [disp, setDisp] = useState({ step: 0, s: TUT_STEPS[0] });
  const [fading, setFading] = useState(false);
  const tmRef = useRef(null);
  const botTmRef = useRef(null);

  useEffect(() => {
    const s = TUT_STEPS[step];
    setFading(true);
    tmRef.current = setTimeout(() => {
      setDisp({ step, s });
      if (!s.target) {
        setSpot(null);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        setBot(120);
        setFading(false);
        return;
      }
      const el = document.getElementById(s.target);
      if (!el) {
        setSpot(null);
        setFading(false);
        return;
      }
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      botTmRef.current = setTimeout(() => {
        const r = el.getBoundingClientRect();
        const p = SPAD;
        setSpot({
          x: r.left - p,
          y: r.top - p,
          w: r.width + p * 2,
          h: r.height + p * 2,
          rx: 10,
        });
        const vh = window.innerHeight;
        const mid = r.top + r.height / 2;
        setBot(
          mid > vh * 0.45
            ? Math.min(Math.max(110, vh - r.top + p + 16), vh - 240)
            : 80
        );
        setFading(false);
      }, 380);
    }, 180);
    return () => {
      clearTimeout(tmRef.current);
      clearTimeout(botTmRef.current);
    };
  }, [step]);

  const next = () => {
    haptic('tap');
    if (step < TUT_STEPS.length - 1) setStep((s) => s + 1);
    else onDone();
  };

  const W = window.innerWidth;
  const H = window.innerHeight;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, pointerEvents: 'none' }}>
      <svg className="tutorial-svg" width={W} height={H}>
        {spot ? (
          <>
            <defs>
              <mask id="tm">
                <rect width={W} height={H} fill="white" />
                <rect x={spot.x} y={spot.y} width={spot.w} height={spot.h} rx={spot.rx} fill="black" />
              </mask>
              <filter id="glow">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            <rect width={W} height={H} fill="rgba(0,0,0,0.78)" mask="url(#tm)" />
            <rect
              x={spot.x} y={spot.y} width={spot.w} height={spot.h} rx={spot.rx}
              fill="none" stroke="rgba(61,107,158,0.95)" strokeWidth="2.5"
              filter="url(#glow)" style={{ animation: 'spotGlow 2s ease-in-out infinite' }}
            />
          </>
        ) : (
          <rect width={W} height={H} fill="rgba(0,0,0,0.78)" />
        )}
      </svg>
      <div
        className="tutorial-card"
        style={{ bottom: `${bot}px`, pointerEvents: 'all' }}
      >
        <div className={`tut-content${fading ? ' fading' : ''}`}>
          <div className="tut-step-num">
            Step {disp.step + 1} of {TUT_STEPS.length}
          </div>
          <div className="tut-title">{disp.s.title}</div>
          <div className="tut-body">{disp.s.body}</div>
          <div className="tut-nav">
            <button
              className="tut-skip"
              onClick={() => {
                haptic('tap');
                onDone();
              }}
            >
              Skip
            </button>
            <div className="tut-dots">
              {TUT_STEPS.map((_, i) => (
                <div
                  key={i}
                  className={`tut-dot${i === disp.step ? ' active' : ''}`}
                />
              ))}
            </div>
            <button
              className="tut-btn primary"
              onClick={next}
              disabled={fading}
            >
              {disp.step === TUT_STEPS.length - 1 ? 'Done' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
