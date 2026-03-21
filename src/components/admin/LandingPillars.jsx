import React from 'react';
import { PLATFORM_PILLARS } from '../../data/landingPageData';

const LandingPillars = () => {
  return (
    <section className="landing-pillars">
      <div className="landing-section-heading js-reveal">
        <p className="landing-section-kicker">Why stakd</p>
        <h2>Built for cash businesses, not office workers.</h2>
        <p>
          No bloated dashboards. No features you will never touch. Just fast counts,
          clear records, and alerts that actually matter.
        </p>
      </div>
      <div className="landing-pillars-grid">
        {PLATFORM_PILLARS.map((pillar, index) => (
          <article
            key={pillar.title}
            className={`landing-pillar-card landing-pillar-card-${index + 1} js-reveal`}
            style={{ transitionDelay: `${index * 90}ms` }}
          >
            <div className="landing-pillar-icon">
              <i className={`fa-solid ${pillar.icon}`} />
            </div>
            <div className="landing-pillar-copy">
              <span className="landing-pillar-kicker">{pillar.kicker}</span>
              <h3>{pillar.title}</h3>
            </div>
            <p>{pillar.description}</p>
            <span className="landing-pillar-tag">{pillar.tag}</span>
          </article>
        ))}
      </div>
    </section>
  );
};

export default LandingPillars;
