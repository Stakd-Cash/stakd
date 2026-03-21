import React from 'react';
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

  return (
    <div className="landing-page">
      <LandingHero navigate={navigate} activeScene={activeScene} />
      <LandingStory activeScene={activeScene} />
      <LandingPillars />
      <LandingPricing navigate={navigate} />
      <LandingBottomCTA navigate={navigate} />
      <LandingFooter navigate={navigate} />
    </div>
  );
}