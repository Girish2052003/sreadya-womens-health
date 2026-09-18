export type PublicPage = {
  slug: string[];
  title: string;
  eyebrow: string;
  summary: string;
};

export const publicPages: PublicPage[] = [
  { slug: ['features'], title: 'Features', eyebrow: 'One Sreva', summary: 'Explore the complete launch capability contract: tracking, predictions, reminders, logging, reproductive observations, life stages, privacy, backup and optional encrypted continuity.' },
  { slug: ['how-it-works'], title: 'How it works', eyebrow: 'Local first', summary: 'Your device is the authoritative home of your health experience. Optional continuity is separate and privacy-preserving.' },
  { slug: ['cycle-tracking'], title: 'Cycle Tracking', eyebrow: 'Understand your rhythm', summary: 'Record period episodes and daily context with a calm interface built around your own history.' },
  { slug: ['predictions'], title: 'Predictions', eyebrow: 'Transparent estimates', summary: 'Sreva uses the same frozen Prediction v1 semantics across clients and communicates confidence rather than certainty.' },
  { slug: ['reminders'], title: 'Reminders', eyebrow: 'Useful, discreet, local', summary: 'Private reminder wording and local wall-clock meaning help you prepare without exposing sensitive context.' },
  { slug: ['insights'], title: 'Insights', eyebrow: 'Your history, made readable', summary: 'Local-first summaries help you notice patterns without sending reproductive-health telemetry to Sreva.' },
  { slug: ['life-stages'], title: 'Life Stages', eyebrow: 'Built for change', summary: 'Sreva adapts language and context across life stages while keeping medical boundaries explicit.' },
  { slug: ['doctor-reports'], title: 'Doctor Reports', eyebrow: 'You choose what leaves', summary: 'Create deliberate, user-selected reports for appointments instead of silently exporting your health history.' },
  { slug: ['privacy'], title: 'Privacy', eyebrow: 'Private by architecture', summary: 'Account-free equality, local intelligence and no health telemetry are product laws, not marketing toggles.' },
  { slug: ['security'], title: 'Security', eyebrow: 'Fail closed', summary: 'Sreva separates local vault protection, optional continuity and release security with explicit trust boundaries.' },
  { slug: ['sync'], title: 'Sync', eyebrow: 'Optional continuity', summary: 'Optional end-to-end encrypted continuity keeps health content encrypted before it leaves an authorized client while account-free Sreva remains complete.' },
  { slug: ['accessibility'], title: 'Accessibility', eyebrow: 'Readable worldwide', summary: 'Keyboard access, strong contrast, zoom, reduced motion and text alternatives are first-class requirements.' },
  { slug: ['download'], title: 'Download', eyebrow: 'Choose your client', summary: 'Sreva is designed as one product across Android, iPhone and an installable Web experience.' },
  { slug: ['install', 'iphone'], title: 'Install on iPhone', eyebrow: 'Sreva on iOS', summary: 'Use the native iOS client when available, or follow the reviewed PWA installation path for the Web client.' },
  { slug: ['install', 'android'], title: 'Install on Android', eyebrow: 'Sreva on Android', summary: 'Use the signed Android client when available, with the Web install path as a separate browser-native option.' },
  { slug: ['install', 'pwa'], title: 'Install the PWA', eyebrow: 'Browser native', summary: 'Install Sreva from a supported browser for a focused app-like experience without pretending the browser is a native keystore.' },
  { slug: ['help'], title: 'Help', eyebrow: 'Clear answers', summary: 'Get practical guidance for local data, backups, privacy controls, permissions and safe recovery.' },
  { slug: ['about'], title: 'About', eyebrow: 'Built with care', summary: 'Sreva is a privacy-first women’s health product designed around dignity, calm interaction and user control.' },
  { slug: ['release-notes'], title: 'Release Notes', eyebrow: 'What changed', summary: 'Release notes make meaningful product, privacy and compatibility changes visible.' },
  { slug: ['privacy-policy'], title: 'Privacy Policy', eyebrow: 'Plain-language policy', summary: 'Read how local account-free use and optional end-to-end encrypted continuity handle health content, operational metadata, recovery, retention and deletion.' },
  { slug: ['terms'], title: 'Terms', eyebrow: 'Product terms', summary: 'Terms are kept separate from health guidance and never expand Sreva into unvalidated diagnostic or contraception claims.' },
  { slug: ['security', 'report'], title: 'Security Report', eyebrow: 'Responsible disclosure', summary: 'Security reporting follows the repository disclosure process without asking users to expose health records.' },
  { slug: ['security-report'], title: 'Security Report', eyebrow: 'Legacy route', summary: 'This compatibility route points users to the canonical security reporting guidance.' },
];

export const workspaceSections = [
  'home', 'today', 'calendar', 'log', 'cycle', 'predictions', 'reminders', 'symptoms', 'wellness',
  'medication', 'reproductive-health', 'life-stage', 'insights', 'reports', 'assistant', 'sharing', 'vault',
  'sync', 'devices', 'privacy', 'account', 'recovery', 'diagnostics', 'settings', 'more',
] as const;

export const workspaceTitles: Record<(typeof workspaceSections)[number], string> = {
  home: 'Home', today: 'Today', calendar: 'Calendar', log: 'Log', cycle: 'Cycle', predictions: 'Predictions',
  reminders: 'Reminders', symptoms: 'Symptoms', wellness: 'Wellness', medication: 'Medication',
  'reproductive-health': 'Reproductive Health', 'life-stage': 'Life Stage', insights: 'Insights', reports: 'Reports',
  assistant: 'Assistant', sharing: 'Sharing', vault: 'Vault', sync: 'Sync', devices: 'Devices', privacy: 'Privacy',
  account: 'Account', recovery: 'Recovery', diagnostics: 'Diagnostics', settings: 'Settings', more: 'More',
};
