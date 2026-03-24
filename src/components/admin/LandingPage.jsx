import React, { useEffect, useRef } from 'react';
import { useLandingScroll } from '../../hooks/useLandingScroll';
import { STORY_STEPS } from '../../data/landingPageData';
import LandingHero from './LandingHero';
import LandingStory from './LandingStory';
import LandingPillars from './LandingPillars';
import LandingPricing from './LandingPricing';
import LandingBottomCTA from './LandingBottomCTA';
import LandingFooter from './LandingFooter';

export function LandingPage({ navigate }) {
  const { activeScene } = useLandingScroll(STORY_STEPS);
  const navWrapRef = useRef(null);

  useEffect(() => {
    const wrap = navWrapRef.current;
    if (!wrap) return;
    const onScroll = () => {
      const scrolled = window.scrollY > 10;
      wrap.classList.toggle('nav--scrolled', scrolled);
    };
    onScroll(); // set initial state
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="landing-page">
      <div className="landing-nav-wrap" ref={navWrapRef}>
        <nav className="landing-nav" aria-label="Primary">
        <button className="landing-nav-brand" onClick={() => navigate('/')} aria-label="Stakd home">
          <img src="/src/stakd-logo-text.svg" alt="stakd" height="32" />
        </button>
        <div className="landing-nav-actions">
          <button className="landing-btn secondary" onClick={() => navigate('/login')}>
            Sign in
          </button>
          <button
            className="landing-btn primary"
            onClick={() => navigate('/login?mode=signup')}
          >
            Start free trial
          </button>
        </div>
        </nav>
      </div>
      <LandingHero navigate={navigate} />
      <LandingStory activeScene={activeScene} />
      <LandingPillars />
      <LandingPricing navigate={navigate} />
      <LandingBottomCTA navigate={navigate} />
      <LandingFooter navigate={navigate} />
    </div>
  );
}