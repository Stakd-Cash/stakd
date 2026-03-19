import React from 'react';

const FEATURES = [
  { icon: 'fa-bolt', title: 'Lightning Fast', desc: 'Count drawers quickly with our intuitive calculator. Tap, type, and drop.' },
  { icon: 'fa-chart-line', title: 'Crystal Clear Dashboard', desc: 'Real-time visibility into every drop. Track variances down to the penny.' },
  { icon: 'fa-users', title: 'Accountability Built-in', desc: 'Individual PINs mean you always know who dropped what and when.' },
  { icon: 'fa-wifi', title: 'Works Offline', desc: 'Stakd queues your drops and syncs them automatically when you reconnect.' },
];

const PRICING_TIERS = [
  {
    name: 'Free',
    price: '$0',
    subtitle: 'Just count',
    desc: 'No account required. No strings.',
    for: 'Individual cashiers, small shops, and people just trying it out.',
    features: [
      'Full drawer counting and calculator',
      'Bill drop calculation',
      'Local history (device only, no cloud)',
      'Dark/light theme and haptics'
    ],
    buttonText: 'Start Counting Now',
    buttonPath: '/calc',
    icon: 'fa-calculator',
    primary: false
  },
  {
    name: 'Pro',
    price: '$29',
    period: '/mo per location',
    subtitle: 'For managers tired of guessing.',
    desc: 'Everything in Free, plus:',
    for: 'Single-location owners, food trucks, cafés, boutiques, and small franchises.',
    features: [
      'Cloud sync: drops are saved and tagged to cashier',
      'Manager and cashier accounts (PIN auth)',
      'Admin dashboard with real-time drop feed',
      'Drop history and basic reporting',
      'Up to 10 staff members',
      'Single location'
    ],
    buttonText: 'Start Free Trial',
    buttonPath: '/login',
    icon: 'fa-briefcase',
    primary: true
  },
  {
    name: 'Business',
    price: '$79',
    period: '/mo',
    subtitle: 'For operators running multiple locations.',
    desc: 'Everything in Pro, plus:',
    for: 'Operators running multiple locations who need centralized reporting.',
    features: [
      'Multi-location support: one dashboard for all stores',
      'Unlimited staff accounts',
      'Cross-location reporting and analytics',
      'CSV and PDF export for accounting',
      'Priority support'
    ],
    buttonText: 'Contact Sales',
    buttonPath: '/login',
    icon: 'fa-building',
    primary: false
  }
];

export function LandingPage({ navigate }) {
  const hideImg = (e) => { e.target.style.display = 'none'; };

  return (
    <div className="landing-page">
      {/* Hero */}
      <header className="landing-hero">
        <div className="landing-hero-content">
          <div className="landing-badge">CASH COUNTING MADE SIMPLE</div>
          <h1 className="landing-title">Count your drawers in seconds, not minutes.</h1>
          <p className="landing-tagline">
            Stakd is a fast, simple way to handle drawer drops. Say goodbye to spreadsheets and manual counting.
          </p>
          <div className="landing-cta">
            <button className="landing-btn primary" onClick={() => navigate('/login')}>
              <i className="fa-solid fa-right-to-bracket" /> Get Started
            </button>
          </div>
          <p className="landing-calc-link">
            Prefer the calculator? <a href="https://apple-counter.site/" target="_blank" rel="noopener noreferrer">Click here</a>
          </p>
        </div>

        <div className="landing-mockups">
          <div className="mockup-desktop">
            <div className="mockup-header">
              <div className="mockup-dot"></div>
              <div className="mockup-dot"></div>
              <div className="mockup-dot"></div>
            </div>
            <div className="mockup-screen">
              <img src="/screenshots/computer.png" alt="Manager Dashboard on Desktop" onError={hideImg} />
              <div className="mockup-fallback">
                <div className="mf-sidebar"></div>
                <div className="mf-content">
                  <div className="mf-row"></div>
                  <div className="mf-row"></div>
                  <div className="mf-row"></div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="mockup-tablet">
            <div className="mockup-screen">
              <img src="/screenshots/tablet.png" alt="Dashboard on Tablet" onError={hideImg} />
              <div className="mockup-fallback">
                <div className="mf-header"></div>
                <div className="mf-content">
                  <div className="mf-card"></div>
                  <div className="mf-card"></div>
                </div>
              </div>
            </div>
          </div>

          <div className="mockup-mobile">
            <div className="mockup-screen">
              <img src="/screenshots/phone.png" alt="Counting App on Mobile" onError={hideImg} />
              <div className="mockup-fallback">
                <div className="mf-header"></div>
                <div className="mf-content">
                  <div className="mf-row"></div>
                  <div className="mf-row"></div>
                  <div className="mf-row"></div>
                  <div className="mf-row"></div>
                </div>
                <div className="mf-footer"></div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Features */}
      <section className="landing-features">
        <div className="landing-section-header">
          <h2>Built for speed.</h2>
          <p>Everything you need to manage your cash flow.</p>
        </div>
        <div className="landing-features-grid">
          {FEATURES.map((f) => (
            <div key={f.title} className="landing-feature-card">
              <div className="landing-feature-icon">
                <i className={`fa-solid ${f.icon}`} />
              </div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="landing-how">
        <div className="landing-section-header">
          <h2>Get started in minutes.</h2>
          <p>A simple setup process to get your team counting.</p>
        </div>
        <div className="landing-steps">
          <div className="landing-step">
            <span className="landing-step-num">1</span>
            <div className="landing-step-content">
              <h3>Create your company</h3>
              <p>Sign up and add your company details to get started.</p>
            </div>
          </div>
          <div className="landing-step">
            <span className="landing-step-num">2</span>
            <div className="landing-step-content">
              <h3>Add your team</h3>
              <p>Hand out secure PINs to your cashiers. Managers stay in the loop.</p>
            </div>
          </div>
          <div className="landing-step">
            <span className="landing-step-num">3</span>
            <div className="landing-step-content">
              <h3>Start counting</h3>
              <p>Count the drawer, submit the drop, and watch the dashboard update live.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="landing-pricing">
        <div className="landing-section-header">
          <h2>Simple, transparent pricing.</h2>
          <p>Free for workers. Paid for bosses. No hidden fees.</p>
        </div>
        <div className="landing-pricing-grid">
          {PRICING_TIERS.map((tier) => (
            <div key={tier.name} className={`landing-pricing-card ${tier.primary ? 'primary' : ''}`}>
              <div className="landing-pricing-header">
                <div className="landing-pricing-icon">
                  <i className={`fa-solid ${tier.icon}`} />
                </div>
                <h3>{tier.name}</h3>
                <div className="landing-pricing-price">
                  <span className="amount">{tier.price}</span>
                  {tier.period && <span className="period">{tier.period}</span>}
                </div>
                <p className="landing-pricing-subtitle">{tier.subtitle}</p>
              </div>
              
              <div className="landing-pricing-body">
                <p className="landing-pricing-desc"><strong>{tier.desc}</strong></p>
                <ul className="landing-pricing-features">
                  {tier.features.map((feature, i) => (
                    <li key={i}>
                      <i className="fa-solid fa-check" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="landing-pricing-footer">
                <div className="landing-pricing-for">
                  <strong>Perfect for:</strong> {tier.for}
                </div>
                <button 
                  className={`landing-btn ${tier.primary ? 'primary' : 'secondary'}`} 
                  onClick={() => navigate(tier.buttonPath)}
                >
                  {tier.buttonText}
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Footer CTA */}
      <section className="landing-bottom-cta">
        <div className="landing-bottom-inner">
          <h2>Ready to streamline your cash drops?</h2>
          <p>Set up Stakd for your business today.</p>
          <button className="landing-btn primary" onClick={() => navigate('/login')}>
            <i className="fa-solid fa-rocket" /> Get Started
          </button>
        </div>
      </section>

      <footer className="landing-footer">
        <div className="landing-footer-brand">
          <img src="/favicon.png" alt="stakd" width="20" height="20" />
          <span>stakd</span>
        </div>
        <div className="landing-footer-copy">
          &copy; {new Date().getFullYear()} stakd. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
