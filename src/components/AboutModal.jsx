import React from 'react';
import { useModalClose } from '../hooks/useModalClose.js';
import { haptic } from '../utils/haptics.js';

export function AboutModal({ onClose }) {
  const [closing, triggerClose] = useModalClose(200);

  return (
    <div
      className={`modal-backdrop${closing ? ' modal-closing' : ''}`}
      onClick={(e) => {
        if (e.target === e.currentTarget) triggerClose(onClose);
      }}
    >
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="about-logo">
          <img src="/favicon.png" alt="" decoding="async" loading="lazy" />
        </div>
        <div className="modal-title" style={{ paddingTop: 0 }}>
          <span className="modal-eyebrow">About</span>
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
        <div className="modal-actions" style={{ marginTop: '22px' }}>
          <button
            className="modal-btn primary"
            onClick={() => triggerClose(onClose)}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
