export const BILL_DENOMS = [100, 50, 20, 10, 5, 1];

export const COIN_DENOMS = [
  { id: '1.00', label: '$1', val: 1.00, roll: null },
  { id: '0.50', label: '50¢', val: 0.50, roll: null },
  { id: '0.25', label: '25¢', val: 0.25, roll: 40 },
  { id: '0.10', label: '10¢', val: 0.10, roll: 50 },
  { id: '0.05', label: '5¢', val: 0.05, roll: 40 },
  { id: '0.01', label: '1¢', val: 0.01, roll: 50 },
];

export const COIN_ROLLS = Object.fromEntries(
  COIN_DENOMS.map((c) => [c.id, c.roll || 0])
);

export const ALL_IDS = [
  ...BILL_DENOMS.map((d) => String(d)),
  ...COIN_DENOMS.map((c) => c.id),
];

export const EMPTY_CASH = Object.fromEntries(ALL_IDS.map((id) => [id, '']));
export const EMPTY_ROLLS = Object.fromEntries(COIN_DENOMS.map((c) => [c.id, 0]));

export const LS_APP_STATE = 'ac_app_state';
export const LS_HISTORY = 'ac_history_v2';
export const LS_SETTINGS = 'ac_settings_v1';
export const LS_TUTORIAL = 'ac_tutorial_v1';
export const LS_RECORD = 'ac_record_v1';
export const LS_THEME = 'ac_theme';
export const LS_HINT = 'ac_hint_v1';
export const LS_CHANGELOG = 'ac_changelog_v1';

export const GH_COMMITS_URL =
  'https://api.github.com/repos/cen0b-dev/stakd/commits?per_page=1';
export const GH_CACHE_KEY = 'ac_gh_cache_v1';
export const GH_CACHE_TTL = 4 * 60 * 60 * 1000; // 4 hours

export const DP_MAX_CENTS = 100000; // $1000



export const DEFAULT_APP_STATE = {
  cash: EMPTY_CASH,
  targetInput: '200',
  billsMode: 'count',
  coinsMode: 'count',
  coinRolls: EMPTY_ROLLS,
  page: 1,
};

export const HISTORY_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'over', label: 'Over target' },
  { id: 'under', label: 'Under target' },
  { id: 'record', label: 'Record' },
];

export const TUT_STEPS = [
  {
    title: 'Welcome to stakd',
    body: "Count your drawer and calculate what to drop. Quick tour — skip anytime.",
    target: null,
  },
  {
    title: 'Enter Bills',
    body: 'Type in the input or tap + / −. Hold + or − to count quickly.',
    target: 'bills-card',
  },
  {
    title: 'Coins & Progress',
    body: 'Tap Coins to expand. The roll button adds a whole roll. The bar fills as you count and turns green at target.',
    target: 'progress-bar',
  },
  {
    title: 'Calculate Drop',
    body: 'Tap Calculate to see which bills to pull. Use the header for History, Settings, and Reset.',
    target: 'calc-btn',
  },
];
