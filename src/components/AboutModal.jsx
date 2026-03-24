import React from 'react';
import { useModalClose } from '../hooks/useModalClose.js';

export function AboutModal({ onClose }) {
  const [closing, triggerClose] = useModalClose(200);

  return (
    <div
      className={`sk-backdrop${closing ? ' sk-modal-closing' : ''}`}
      onClick={(e) => {
        if (e.target === e.currentTarget) triggerClose(onClose);
      }}
      role="dialog"
      aria-modal="true"
      aria-label="About stakd"
    >
      <div className="sk-modal" onClick={(e) => e.stopPropagation()}>
        <div className="sk-modal-body">
          <div className="about-logo">
            <img src="/src/stakd-logo-mark.svg" alt="" decoding="async" loading="lazy" />
          </div>
          <div className="sk-modal-title sk-modal-title--about-inline">
            <span className="sk-modal-eyebrow">About</span>
            <br />
            stakd
          </div>
          <div className="about-tagline">
            &quot;Counting is freakin&apos; hard, man.&quot;
          </div>
          <div className="about-credit">
            Created by <strong>Garrett</strong> to make counting your drawer
            easier.
            <br />
            <br />
            stakd helps you quickly total up your drawer and figure out
            exactly what needs to be dropped — almost set it and forget it!
            <br />
            <br />
            Advanced algorithms calculate the best possible drawer makeup. No more
            ending up with barely any ones or way too many twenties.
          </div>
        </div>
        <div className="sk-modal-actions">
          <button
            type="button"
            className="sk-btn sk-btn-primary sk-btn-lg"
            onClick={() => triggerClose(onClose)}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
