import React from 'react';
import { HERO_SIGNALS } from '../../data/landingPageData';

const LandingHero = ({ navigate, activeScene }) => {
  const hideImg = (e) => {
    e.target.style.display = 'none';
  };

  return (
    <header className="landing-hero">
      <div className="landing-hero-copy js-reveal">
        <div className="landing-badge">
          <span className="landing-badge-dot" />
          Stop losing cash to counting errors and bad handoffs
        </div>
        <h1 className="landing-title">
          <span className="landing-title-desktop">
            Know your drawer counts are right without hovering over your staff.
          </span>
          <span className="landing-title-mobile">Trust every drawer without hovering over staff.</span>
        </h1>
        <p className="landing-tagline">
          <span className="landing-tagline-desktop">
            Cashiers count faster. Managers see problems before the shift ends. Owners get proof
            when numbers do not add up. No more back-room detective work.
          </span>
          <span className="landing-tagline-mobile">
            Cashiers count fast. Managers catch problems before close. Owners keep proof.
          </span>
        </p>
        <div className="landing-cta">
          <button className="landing-btn primary" onClick={() => navigate('/login?mode=signup')}>
            <i className="fa-solid fa-rocket" /> Start free trial
          </button>
          <button className="landing-btn secondary" onClick={() => navigate('/calc')}>
            <i className="fa-solid fa-calculator" /> Try calculator
          </button>
        </div>
        <div className="landing-hero-meta">
          <div className="landing-proof-row">
            {HERO_SIGNALS.map((signal, index) => (
              <div
                key={signal.label}
                className="landing-proof-pill"
                style={{ transitionDelay: `${index * 100}ms` }}
              >
                <strong>{signal.value}</strong>
                <span>{signal.label}</span>
              </div>
            ))}
          </div>
          <div className="landing-login-hint">
            <span>Returning user?</span>
            <button className="landing-link" onClick={() => navigate('/login')}>
              Sign in
            </button>
          </div>
        </div>
        <div className="landing-mobile-summary">
          <div className="landing-mobile-outcome">
            <span className="landing-mobile-label">Why operators switch</span>
            <strong>See what is wrong before the shift ends.</strong>
            <p>Fast counts for staff, instant answers for managers, and proof for owners.</p>
          </div>
          <div className="landing-mobile-checklist">
            <div className="landing-mobile-check">
              <i className="fa-solid fa-check" />
              <span>Fast counts for busy cashiers</span>
            </div>
            <div className="landing-mobile-check">
              <i className="fa-solid fa-check" />
              <span>Live drawer status for managers</span>
            </div>
            <div className="landing-mobile-check">
              <i className="fa-solid fa-check" />
              <span>Timestamped proof for owners</span>
            </div>
          </div>
        </div>
      </div>

      <div className={`landing-hero-stage is-${activeScene}`}>
        <div className="landing-stage-caption">
          <span className="signal-label">Live dashboard</span>
          <strong>Every drawer status, one glance away</strong>
        </div>
        <div className="landing-mobile-stage-intro">
          <span className="landing-mobile-label">What the app shows</span>
          <strong>One clean view for counts, alerts, and proof.</strong>
        </div>
        <div className="landing-glow landing-glow-a" />
        <div className="landing-glow landing-glow-b" />
        <div className="landing-stage-ticket landing-stage-ticket-a">
          <span className="signal-label">Variance alert</span>
          <strong>Catch shortages while the shift is running.</strong>
        </div>
        <div className="landing-stage-ticket landing-stage-ticket-b">
          <span className="signal-label">Fast counts</span>
          <strong>New staff count accurately from day one.</strong>
        </div>
        <div className="landing-stage-card landing-stage-card-desktop">
          <div className="landing-stage-topbar">
            <span />
            <span />
            <span />
          </div>
          <div className="landing-stage-screen">
            <img
              src="/screenshots/computer.png"
              alt="Stakd manager dashboard on desktop"
              onError={hideImg}
            />
          </div>
        </div>
        <div className="landing-stage-card landing-stage-card-tablet">
          <div className="landing-stage-screen">
            <img
              src="/screenshots/tablet.png"
              alt="Stakd dashboard on tablet"
              onError={hideImg}
            />
          </div>
        </div>
        <div className="landing-stage-card landing-stage-card-mobile">
          <div className="landing-stage-screen">
            <img
              src="/screenshots/phone.png"
              alt="Stakd counting flow on mobile"
              onError={hideImg}
            />
          </div>
        </div>
        <div className="landing-floating-signal landing-floating-signal-a">
          <span className="signal-label">Full history</span>
          <strong>Every count logged, searchable, exportable.</strong>
        </div>
        <div className="landing-floating-signal landing-floating-signal-b">
          <span className="signal-label">Smart alerts</span>
          <strong>Know immediately when a drawer is off.</strong>
        </div>
        <div className="landing-mobile-stage-notes">
          <div className="landing-mobile-stage-note">
            <span className="signal-label">Manager view</span>
            <strong>Spot missed drops and shortages instantly.</strong>
          </div>
          <div className="landing-mobile-stage-note">
            <span className="signal-label">Cashier flow</span>
            <strong>Big inputs and clear totals keep counts moving.</strong>
          </div>
        </div>
      </div>

      <div className="landing-scroll-indicator">
        <div className="landing-scroll-mouse">
          <div className="landing-scroll-wheel" />
        </div>
        <span className="landing-scroll-text">Scroll to explore</span>
      </div>
    </header>
  );
};

export default LandingHero;
