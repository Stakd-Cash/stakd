import React from 'react';

const LandingFooter = ({ navigate }) => {
  return (
    <footer className="landing-footer">
      <div className="landing-footer-brand">
        <img src="/src/stakd-logo-mark.svg" alt="stakd" width="14" height="14" />
        <div className="landing-footer-brand-copy">
          <span>
            <img src="/src/stakd-logo-text.svg" alt="stakd" height="14" />
          </span>
          <small>cash control for real-world operators</small>
        </div>
      </div>
      <div className="landing-footer-meta">
        <span className="landing-footer-copy">
          &copy; {new Date().getFullYear()} stakd. All rights reserved.
        </span>
        <div className="landing-footer-links">
          <button className="landing-footer-link" onClick={() => navigate('/kiosk')}>
            Calculator
          </button>
          <button className="landing-footer-link" onClick={() => navigate('/login')}>
            Launch app
          </button>
        </div>
      </div>
    </footer>
  );
};

export default LandingFooter;
