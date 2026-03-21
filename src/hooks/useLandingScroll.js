import { useEffect, useState } from 'react';

export const useLandingScroll = (steps) => {
  const [activeScene, setActiveScene] = useState(steps[0]?.id || '');

  useEffect(() => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const page = document.querySelector('.landing-page');
    if (!page) return undefined;
    
    const sceneNodes = Array.from(page.querySelectorAll('[data-scene-id]'));

    const Observer = window.IntersectionObserver;
    if (!Observer || reduceMotion) {
      page
        .querySelectorAll('.js-reveal')
        .forEach((node) => node.classList.add('is-visible'));
      if (sceneNodes[0]) {
        setActiveScene(sceneNodes[0].getAttribute('data-scene-id'));
      }
      return undefined;
    }

    const revealObserver = new Observer(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            revealObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.08, rootMargin: '0px 0px -40px 0px' }
    );

    let frameId = null;
    let currentSceneId = steps[0]?.id || '';
    const updateActiveScene = () => {
      frameId = null;
      if (!sceneNodes.length) return;
      const targetY = window.innerHeight * 0.42;

      let nextId = sceneNodes[0].getAttribute('data-scene-id');
      let closestDistance = Number.POSITIVE_INFINITY;

      sceneNodes.forEach((node) => {
        const rect = node.getBoundingClientRect();
        const cardCenter = rect.top + rect.height / 2;
        const distance = Math.abs(cardCenter - targetY);

        if (distance < closestDistance) {
          closestDistance = distance;
          nextId = node.getAttribute('data-scene-id');
        }
      });

      // Only update state if scene actually changed
      if (nextId !== currentSceneId) {
        currentSceneId = nextId;
        setActiveScene(nextId);
      }
    };

    const scheduleSceneUpdate = () => {
      if (frameId !== null) return;
      frameId = window.requestAnimationFrame(updateActiveScene);
    };

    page.querySelectorAll('.js-reveal').forEach((node) => revealObserver.observe(node));
    scheduleSceneUpdate();
    window.addEventListener('scroll', scheduleSceneUpdate, { passive: true });
    window.addEventListener('resize', scheduleSceneUpdate);

    return () => {
      revealObserver.disconnect();
      if (frameId !== null) {
        window.cancelAnimationFrame(frameId);
      }
      window.removeEventListener('scroll', scheduleSceneUpdate);
      window.removeEventListener('resize', scheduleSceneUpdate);
    };
  }, [steps]);

  return { activeScene };
};