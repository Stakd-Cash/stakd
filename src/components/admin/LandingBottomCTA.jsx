import React from 'react';

const LandingBottomCTA = ({ navigate }) => {
  return (
    <section className="landing-bottom-cta reveal">
      <div className="landing-bottom-inner">
        <p className="landing-section-kicker">Ready to stop losing cash?</p>
        <h2>Get drawer counts you can trust—in under a minute.</h2>
        <p>
          Fast counts for cashiers. Instant alerts for managers. Complete records for owners.
          Start free, no credit card required.
        </p>
        <div className="landing-cta">
          <button className="landing-btn primary" onClick={() => navigate('/login')}>
            <i className="fa-solid fa-right-to-bracket" /> Launch stakd
          </button>
          <button className="landing-btn secondary" onClick={() => navigate('/kiosk')}>
            <i className="fa-solid fa-bolt" /> Count a drawer
          </button>
        </div>
      </div>
    </section>
  );
};

export default LandingBottomCTA;
