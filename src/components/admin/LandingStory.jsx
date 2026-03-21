import React from 'react';
import { STORY_STEPS } from '../../data/landingPageData';

const LandingStory = ({ activeScene }) => {
  const hideImg = (e) => {
    e.target.style.display = 'none';
  };

  return (
    <section className="landing-story">
      <div className="landing-section-heading js-reveal">
        <p className="landing-section-kicker">How it works</p>
        <h2>One system from register to reconciliation.</h2>
        <p>
          Counting, tracking, and reporting all connect. No duplicate entry, no lost paper slips,
          no wondering who dropped what and when.
        </p>
      </div>

      <div className="landing-story-grid">
        <div className="landing-story-steps">
          {STORY_STEPS.map((step) => (
            <article
              key={step.id}
              className={`landing-story-card ${activeScene === step.id ? 'is-active' : ''}`}
              data-scene-id={step.id}
            >
              <p className="landing-story-eyebrow">{step.eyebrow}</p>
              <h3>{step.title}</h3>
              <p className="landing-story-description">{step.description}</p>
              <ul className="landing-story-points">
                {step.points.map((point) => (
                  <li key={point}>
                    <i className="fa-solid fa-check" />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
              <div className="landing-story-signal">{step.signal}</div>
            </article>
          ))}
        </div>

        <div className="landing-story-visual">
          <div className={`landing-showcase-stage is-${activeScene}`}>
            <div className="showcase-orbit orbit-a" />
            <div className="showcase-orbit orbit-b" />
            <div className="showcase-device showcase-device-desktop">
              <img
                src="/screenshots/computer.png"
                alt="Stakd manager dashboard"
                onError={hideImg}
              />
            </div>
            <div className="showcase-device showcase-device-tablet">
              <img
                src="/screenshots/tablet.png"
                alt="Stakd tablet dashboard"
                onError={hideImg}
              />
            </div>
            <div className="showcase-device showcase-device-mobile">
              <img
                src="/screenshots/phone.png"
                alt="Stakd mobile counter"
                onError={hideImg}
              />
            </div>
            <div className="showcase-panel showcase-panel-desktop">
              <span className="showcase-label">Manager view</span>
              <strong>See which drawers need attention before anyone asks.</strong>
            </div>
            <div className="showcase-panel showcase-panel-mobile">
              <span className="showcase-label">Cashier flow</span>
              <strong>Fast enough for busy shifts, clear enough for new hires.</strong>
            </div>
            <div className="showcase-panel showcase-panel-ops">
              <span className="showcase-label">Owner proof</span>
              <strong>
                Complete records ready for accounting, audits, or disputes.
              </strong>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default LandingStory;
