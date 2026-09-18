'use client';

import { usePathname } from 'next/navigation';

const SIMPLE_GUIDANCE: Record<string, string> = {
  home: 'See your private cycle summary and the next useful action.',
  today: 'See what you recorded today.',
  log: 'Add a private health record. You can delete it later.',
  calendar: 'Look back at period dates in month, timeline, or year views.',
  cycle: 'Start, end, correct, or add a note to a period.',
  predictions: 'See an estimate from your own history. It is not a guarantee.',
  reminders: 'Choose when Sreadya should remind you and how much the notification should say.',
  symptoms: 'Record symptoms and how strong they feel.',
  wellness: 'Record mood, sleep, energy, stress, water, exercise, or weight.',
  medication: 'Record medicine, supplements, or contraception context.',
  'reproductive-health': 'Record optional reproductive observations. These stay private in your vault.',
  'life-stage': 'Choose the life-stage context that fits you now. Changing it does not delete history.',
  insights: 'See patterns found in your own records. Sreadya does not invent a diagnosis.',
  reports: 'Choose what to include, preview it, then export only if you want.',
  assistant: 'Type a simple command. Sreadya explains it before changing private data.',
  sharing: 'Choose exactly what to share and review it before handoff.',
  vault: 'Create or restore an encrypted backup of your local Sreadya data.',
  sync: 'Review optional encrypted continuity. Local Sreadya still works without it.',
  devices: 'Review trusted-device continuity when an account service is configured.',
  privacy: 'See where data lives and open privacy, export, device, and sharing controls.',
  account: 'Account mode is optional. It adds continuity, not extra health features.',
  recovery: 'Recovery protects optional account continuity. Email or SMS cannot decrypt an old vault.',
  diagnostics: 'Create a technical report that leaves out health records.',
  settings: 'Change appearance, accessibility, privacy, reminders, and formatting.',
  more: 'Open any Sreadya feature from one complete list.',
};

export function EasyLanguageGuide() {
  const pathname = usePathname();
  const section = pathname.split('/').filter(Boolean).at(-1) ?? 'home';
  const guidance = SIMPLE_GUIDANCE[section] ?? 'Use the controls on this page. Sreadya keeps health actions explicit and private.';
  return (
    <aside className="easy-language-guide" aria-label="Easy language guide">
      <strong>Easy language</strong>
      <span>{guidance}</span>
    </aside>
  );
}
