import React from 'react';
import { PRICING_TIERS } from '../../data/landingPageData';

const LandingPricing = ({ navigate }) => {
  return (
    <section className="landing-pricing">
      <div className="landing-section-heading js-reveal">
        <p className="landing-section-kicker">Pricing</p>
        <h2>Free to try. Worth it once cash accountability matters.</h2>
        <p>
          Start with the calculator—no signup needed. Upgrade when you are ready to stop
          wondering where the money went.
        </p>
      </div>
      <div className="landing-pricing-grid">
        {PRICING_TIERS.map((tier, index) => (
          <article
            key={tier.name}
            className={`landing-pricing-card js-reveal ${tier.primary ? 'primary' : ''}`}
            style={{ transitionDelay: `${index * 110}ms` }}
          >
            <div className="landing-pricing-header">
              <div className="landing-pricing-icon">
                <i className={`fa-solid ${tier.icon}`} />
              </div>
              <div>
                <h3>{tier.name}</h3>
                <p className="landing-pricing-subtitle">{tier.subtitle}</p>
              </div>
            </div>
            <div className="landing-pricing-price">
              <span className="amount">{tier.price}</span>
              {tier.period && <span className="period">{tier.period}</span>}
            </div>
            <p className="landing-pricing-desc">{tier.desc}</p>
            <ul className="landing-pricing-features">
              {tier.features.map((feature) => (
                <li key={feature}>
                  <i className="fa-solid fa-check" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
            <button
              className={`landing-btn ${tier.primary ? 'primary' : 'secondary'}`}
              onClick={() => navigate(tier.buttonPath)}
            >
              {tier.buttonText}
            </button>
          </article>
        ))}
      </div>
    </section>
  );
};

export default LandingPricing;
