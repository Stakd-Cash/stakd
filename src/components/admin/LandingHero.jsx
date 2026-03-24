import React from 'react';
import { HERO_SIGNALS } from '../../data/landingPageData';

const LandingHero = ({ navigate }) => {
  const hideImg = (e) => {
    e.target.style.display = 'none';
  };

  return (
    <section className="landing-hero-section stakd-pattern-bg">
      <header className="landing-hero">
      <div className="landing-hero-grid">
        <div className="landing-hero-copy">
          <div className="landing-hero-badge hero-reveal">
            <span className="landing-hero-badge-dot" />
            <span>Cash control for real-world operators</span>
          </div>

          <h1 className="landing-hero-title hero-reveal">
            Know your drawer counts are right.
          </h1>

          <p className="landing-hero-subtitle hero-reveal">
            Cashiers count faster. Managers catch problems before the shift ends.
            Owners get proof when numbers don&apos;t add up.
          </p>

          <div className="landing-hero-actions hero-reveal">
            <button
              className="landing-hero-cta"
              onClick={() => navigate('/kiosk')}
            >
              <i className="fa-solid fa-calculator" />
              <span>Try the calculator — free</span>
            </button>
            <button
              className="landing-hero-secondary"
              onClick={() => navigate('/login?mode=signup')}
            >
              Start free trial
            </button>
          </div>

          <div className="landing-hero-signin hero-reveal">
            <span>Already have an account?</span>
            <button className="landing-hero-link" onClick={() => navigate('/login')}>
              Sign in
            </button>
          </div>
        </div>

        <div className="landing-hero-visual">
          <div className="landing-hero-visual-inner">
            <div className="landing-hero-device landing-hero-device-main">
              <div className="landing-hero-device-bar">
                <span /><span /><span />
              </div>
              <div className="landing-hero-device-screen">
                <img
                  src="/screenshots/computer.png"
                  alt="Stakd manager dashboard"
                  onError={hideImg}
                />
              </div>
            </div>
            <div className="landing-hero-device landing-hero-device-phone">
              <div className="landing-hero-device-screen">
                <img
                  src="/screenshots/phone.png"
                  alt="Stakd counting flow on mobile"
                  onError={hideImg}
                />
              </div>
            </div>
            <div className="landing-hero-float landing-hero-float-a">
              <span className="landing-hero-float-label">Variance alert</span>
              <strong>Catch shortages mid-shift.</strong>
            </div>
            <div className="landing-hero-float landing-hero-float-b">
              <span className="landing-hero-float-label">Full history</span>
              <strong>Every count logged and searchable.</strong>
            </div>
          </div>
        </div>
      </div>

      <div className="landing-hero-stats">
        {HERO_SIGNALS.map((signal) => (
          <div key={signal.label} className="landing-hero-stat">
            <strong>{signal.value}</strong>
            <span>{signal.label}</span>
          </div>
        ))}
      </div>
    </header>
    </section>
  );
};

export default LandingHero;
