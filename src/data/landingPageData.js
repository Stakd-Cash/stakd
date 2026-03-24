export const HERO_SIGNALS = [
  { value: 'Faster counts', label: 'cashiers finish in under 60 seconds' },
  { value: 'Real-time alerts', label: 'when cash goes missing mid-shift' },
  { value: 'Timestamped proof', label: 'zero disputes at shift end' },
];

export const STORY_STEPS = [
  {
    id: 'capture',
    eyebrow: 'Capture',
    title: 'Cashiers count in seconds, not minutes.',
    description:
      'Large buttons, haptic feedback, and one-tap entry mean new staff count accurately from day one—no training manual required.',
    points: [
      'Count a drawer in under 60 seconds',
      'Every transaction tied to the cashier who made it',
    ],
    signal: 'Built for real registers, not spreadsheets',
  },
  {
    id: 'monitor',
    eyebrow: 'Monitor',
    title: 'Catch problems while the shift is still running.',
    description:
      'See every drawer status at a glance. When numbers do not add up, you will know which cashier and which drawer—before they clock out.',
    points: [
      'Instant variance alerts by store and staff',
      'No more end-of-shift surprises or finger-pointing',
    ],
    signal: 'Live dashboard, no refresh needed',
  },
  {
    id: 'control',
    eyebrow: 'Control',
    title: 'End the back-room detective work.',
    description:
      'Every drop, count, and adjustment logged with who, when, and where. When accounting, audits, or disputes arise, the answer is already in the system.',
    points: [
      'Export reports for your bookkeeper in one click',
      'Resolve cash discrepancies in minutes, not hours',
    ],
    signal: 'Audit-ready records',
  },
];

export const PLATFORM_PILLARS = [
  {
    icon: 'fa-hand-pointer',
    kicker: 'Speed',
    title: 'Count fast, count right',
    description:
      'Big tap targets and instant feedback mean your fastest cashier and your newest hire both finish counts without errors—even during the dinner rush.',
    tag: '60-second counts',
  },
  {
    icon: 'fa-tower-broadcast',
    kicker: 'Everywhere',
    title: 'One system, any device',
    description:
      'Same experience on the register tablet, the office laptop, or the owner\'s phone. No syncing headaches, no feature gaps between devices.',
    tag: 'Phone to desktop',
  },
  {
    icon: 'fa-shield-halved',
    kicker: 'Accountability',
    title: 'Know exactly who did what',
    description:
      'PIN-based logins mean every count and drop is tied to a real person. When cash is short, there is no mystery—just facts.',
    tag: 'Staff-level tracking',
  },
  {
    icon: 'fa-cloud-arrow-up',
    kicker: 'Reliability',
    title: 'Works even when wifi does not',
    description:
      'Spotty connection in the stockroom? No problem. Counts save locally and sync when you are back online. Never lose a drawer record again.',
    tag: 'Offline capable',
  },
];

export const PRICING_TIERS = [
  {
    name: 'Free',
    price: '$0',
    subtitle: 'Just count',
    desc: 'No account required. Fast, accurate drawer math on any device.',
    features: [
      'Full counting calculator',
      'Drop amount calculation',
      'Local history on your device',
      'Dark mode and haptics',
    ],
    buttonText: 'Open Calculator',
    buttonPath: '/kiosk',
    icon: 'fa-calculator',
    primary: false,
  },
  {
    name: 'Solo',
    price: '$9',
    period: '/mo per location',
    subtitle: 'Small team, big upgrade',
    desc: 'Cloud-synced drops with manager and cashier accounts for your location.',
    features: [
      'Cloud-synced drops across devices',
      '1 manager + 2 cashier accounts',
      'Drop history and reporting',
    ],
    buttonText: 'Get Started',
    buttonPath: '/login?mode=signup',
    icon: 'fa-seedling',
    primary: false,
  },
  {
    name: 'Pro',
    price: '$29',
    period: '/mo per location',
    subtitle: 'Stop cash leaks before they add up',
    desc: 'For store managers who need real-time visibility and staff accountability.',
    features: [
      'Cloud-synced drops across devices',
      'Manager and cashier accounts',
      'Real-time variance alerts',
      'Full history and reporting',
      {
        text: 'Up to 10 staff members included',
        note: 'Need more staff? Add seats for $5/mo each — up to 20 total.',
      },
    ],
    buttonText: 'Start Free Trial',
    buttonPath: '/login?mode=signup',
    icon: 'fa-briefcase',
    primary: true,
  },
  {
    name: 'Business',
    price: '$79',
    period: '/mo flat',
    subtitle: 'Control cash across every location',
    desc: 'For multi-store operators who need one clear picture of cash flow everywhere.',
    features: [
      'Everything in Pro',
      'Multi-location dashboard',
      'Unlimited staff accounts',
      'Cross-location cash analytics',
      'CSV and PDF exports',
      'Priority support',
      'Best value at 11+ staff or 2+ locations.',
    ],
    buttonText: 'Talk to Us',
    buttonPath: '/login?mode=signup',
    icon: 'fa-building',
    primary: false,
  },
];