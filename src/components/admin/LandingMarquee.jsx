import React from 'react';

const MARQUEE_ITEMS = [
  'Drawer counting',
  'Manager dashboard',
  'PIN accountability',
  'Offline resilience',
  'Multi-location reporting',
];

const LandingMarquee = () => {
  return (
    <section className="landing-marquee js-reveal">
      <div className="landing-marquee-track">
        {[0, 1].map((copy) => (
          <div
            key={copy}
            className="landing-marquee-group"
            aria-hidden={copy === 1 ? 'true' : undefined}
          >
            {MARQUEE_ITEMS.map((item) => (
              <span key={`${copy}-${item}`}>{item}</span>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
};

export default LandingMarquee;
