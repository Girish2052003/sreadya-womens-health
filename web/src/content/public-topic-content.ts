export type PublicTopicSection = {
  title: string;
  body: string;
  href?: string;
  action?: string;
};

export type PublicTopic = {
  intro: string;
  sections: PublicTopicSection[];
  boundary?: string;
};

export const publicTopicContent: Record<string, PublicTopic> = {
  "how-it-works": {
    intro: "Sreva separates your local health experience from optional continuity. Tracking, predictions, insights and reports run on the client; account services never become the health-intelligence engine.",
    sections: [
      { title: "1 · Your device is authoritative", body: "Period history, observations, preferences and local intelligence live in the encrypted Sreva vault on this device.", href: "/app/home", action: "Open private Sreva" },
      { title: "2 · Intelligence stays local", body: "Prediction v1, insights, reminder planning, reports and the deterministic assistant use local health history rather than sending reproductive-health plaintext to analytics or a cloud AI service.", href: "/predictions", action: "Read about predictions" },
      { title: "3 · Continuity is optional", body: "When an approved identity/sync service is configured, clients encrypt health content before synchronization. Account-free Sreva remains complete without that service.", href: "/sync", action: "See the sync boundary" },
    ],
  },
  "cycle-tracking": {
    intro: "Sreva supports period start/end, corrections, flow, notes, month/timeline/year history, irregular cycles and cycle statistics without forcing a 28-day assumption.",
    sections: [
      { title: "Record and correct", body: "Start or end a period, backdate or correct dates, and delete mistakes from the encrypted local record.", href: "/app/cycle", action: "Open Cycle" },
      { title: "Flow and context", body: "Record spotting, light, medium or heavy flow and add optional private cycle notes or reproductive observations.", href: "/app/reproductive-health", action: "Log reproductive context" },
      { title: "History that stays editable", body: "Use monthly, timeline and year views to review the history you entered. Historical editing remains available.", href: "/app/calendar", action: "Open Calendar" },
    ],
  },
  "predictions": {
    intro: "Predictions are estimates from your own valid cycle history. Sreva shows uncertainty and confidence instead of pretending future biology is certain.",
    sections: [
      { title: "Expected date and window", body: "See the most likely next-period date, a wider expected window, confidence and cycle-length trend.", href: "/app/predictions", action: "Open Predictions" },
      { title: "History and accuracy", body: "The browser stores prediction history locally with the algorithm version and input reference so later outcomes can be evaluated.", href: "/app/predictions", action: "Review prediction history" },
      { title: "Fertility boundary", body: "Ovulation and fertile-window estimates appear only where enabled by life-stage context. They are not certified contraception or a clinical fertility guarantee.", href: "/app/life-stage", action: "Review life-stage context" },
    ],
  },
  "reminders": {
    intro: "A private 3-day-before-period reminder is the frozen default. You can change cycle reminders, personal reminder families, time, quiet hours, snooze and notification privacy.",
    sections: [
      { title: "Private default", body: "New local vaults enable the discreet 3-day cycle reminder by default. Seven-day, one-day, expected-day and late reminders remain adjustable.", href: "/app/reminders", action: "Open Reminders" },
      { title: "Personal reminder families", body: "Create medication, contraception-context, supplement, ovulation-test, pregnancy-test or custom wellness reminders and choose a snooze interval.", href: "/app/reminders", action: "Manage personal reminders" },
      { title: "Browser-adapted delivery", body: "Reminder Health shows permission, time zone, installed-PWA state and the next intent. Closed-app delivery is only claimed when the browser and reviewed delivery path can provide it.", href: "/app/reminders", action: "Check Reminder Health" },
    ],
  },
  "insights": {
    intro: "Insights summarize your records; they do not invent diagnoses. Sreva explains the data range and sources behind an observation.",
    sections: [
      { title: "Cycle statistics", body: "Average, shortest and longest cycle, period duration and variation are calculated from your own valid history.", href: "/app/insights", action: "Open Insights" },
      { title: "Patterns you recorded", body: "Review flow, symptom, PMS, mood, pain and sleep patterns when enough local observations exist.", href: "/app/insights", action: "Review patterns" },
      { title: "Prediction accuracy", body: "When actual period outcomes exist, Sreva can evaluate historical prediction accuracy without turning the result into a medical explanation.", href: "/app/insights", action: "Review accuracy" },
    ],
  },
  "life-stages": {
    intro: "Sreva adapts context across regular cycles, trying to conceive, pregnancy, postpartum, breastfeeding, perimenopause, menopause transition and hormonal contraception.",
    sections: [
      { title: "Change context without deleting history", body: "Changing life-stage mode changes presentation and relevant estimates; it never erases health history you already recorded.", href: "/app/life-stage", action: "Open Life Stage" },
      { title: "Trying to conceive", body: "Optional fertility-oriented estimates can be shown in this context while keeping the non-contraceptive and non-diagnostic boundary explicit.", href: "/app/predictions", action: "See prediction boundaries" },
      { title: "Your mode is private", body: "Life-stage settings are stored in the encrypted local Sreva vault and do not require an account.", href: "/privacy", action: "Read the privacy model" },
    ],
  },
  "doctor-reports": {
    intro: "A report exists only after you choose a date range and categories, preview the result, and explicitly export it.",
    sections: [
      { title: "Choose the scope", body: "Select dates and categories such as periods, flow, symptoms, pain, temperature/ovulation observations and optional notes.", href: "/app/reports", action: "Build a report" },
      { title: "Preview before sharing", body: "Sensitive categories are not silently added. The preview is generated locally before CSV or PDF export becomes available.", href: "/app/reports", action: "Preview locally" },
      { title: "You decide what leaves", body: "Sreva does not upload the report to create it. Export is an explicit user action.", href: "/privacy", action: "Review data controls" },
    ],
  },
  "privacy": {
    intro: "Privacy is an operating rule: account-free equality, encrypted local storage, no reproductive-health analytics payload and truthful platform limitations.",
    sections: [
      { title: "Encrypted local vault", body: "Health records are encrypted before IndexedDB persistence. The browser-local vault remains authoritative.", href: "/app/vault", action: "Open Vault" },
      { title: "PIN and platform boundaries", body: "Web supports a local PIN gate and automatic lock. Sreva does not rename that into native biometric security, and the browser controls screenshots and app-switcher previews.", href: "/app/settings", action: "Open privacy settings" },
      { title: "Review and revoke", body: "The Privacy Center links backup/export, connected-device state, partner sharing, notification privacy, account boundaries and sanitized diagnostics.", href: "/app/privacy", action: "Open Privacy Center" },
    ],
  },
  "security": {
    intro: "Sreva fails closed around keys, health plaintext and release evidence. Security boundaries are separate for the local vault, optional continuity and software delivery.",
    sections: [
      { title: "Local cryptography", body: "Health records use authenticated encryption. Backup restore validates integrity and compatibility before replacing live health data.", href: "/app/vault", action: "Review backup controls" },
      { title: "Optional E2EE continuity", body: "The sync protocol transports authenticated ciphertext and operational metadata; the service is not supposed to receive readable health content.", href: "/sync", action: "Read the continuity model" },
      { title: "Responsible reporting", body: "Security reports should contain technical reproduction information, not exported health records.", href: "/security/report", action: "Security reporting" },
    ],
  },
  "sync": {
    intro: "Cross-device continuity is optional. The static GitHub Pages client remains fully usable account-free even when no approved sync-service URL is configured.",
    sections: [
      { title: "Local-first during outage or absence", body: "Logging and local intelligence keep working. The Web client reports the continuity endpoint state instead of simulating a successful server sync.", href: "/app/sync", action: "Open Sync status" },
      { title: "Ciphertext-only service boundary", body: "When continuity is configured, clients encrypt locally and the service stores opaque ciphertext plus minimum operational metadata.", href: "/security", action: "Review security" },
      { title: "Trusted devices and recovery", body: "Device enrollment, revocation, passkey identity and recovery require the optional continuity service and authenticated device state. They are never faked by the static site.", href: "/app/devices", action: "Review device state" },
    ],
    boundary: "Provider-dependent continuity is part of the approved target architecture but is not claimed as live on a static Pages deployment without a configured service endpoint.",
  },
  "accessibility": {
    intro: "Sreva provides light/dark presentation, text scaling, reduced motion, high contrast, keyboard/screen-reader semantics, easy-language guidance and locale/RTL formatting infrastructure.",
    sections: [
      { title: "Presentation choices", body: "Choose larger text, reduced motion, high contrast, light/dark appearance and easy-language guidance. Preferences remain local to this browser.", href: "/app/settings", action: "Open Accessibility settings" },
      { title: "Worldwide formatting", body: "Choose metric/imperial units, 12/24-hour time and a BCP-47 formatting locale. RTL direction is applied for supported right-to-left locales while the reviewed message catalogue remains English.", href: "/app/settings", action: "Open worldwide settings" },
      { title: "Offline and small-screen use", body: "The installable PWA keeps an offline application shell and the private navigation is designed for desktop, tablet and one-handed mobile layouts.", href: "/install/pwa", action: "Install the PWA" },
    ],
  },
  "download": {
    intro: "Choose the Sreva client that is actually available. This static site does not invent an App Store or Play Store listing that has not been published.",
    sections: [
      { title: "Web / PWA · available now", body: "Open the full account-free Web client in a browser or install it to the Home Screen/Desktop for a focused standalone experience.", href: "/install/pwa", action: "Install the PWA" },
      { title: "Android", body: "The Android client is built from the same capability contract. Until a production store/download channel is published, use reviewed Android/PWA guidance rather than an unverified package link.", href: "/install/android", action: "Android guidance" },
      { title: "iPhone / iPad", body: "Native iOS distribution is shown only when available. The reviewed Safari Add to Home Screen path provides the current installable Web option.", href: "/install/iphone", action: "iPhone guidance" },
    ],
  },
  "help": {
    intro: "Start with the task you need. Sreva keeps recovery, privacy and health actions explicit rather than hiding them behind a generic support form.",
    sections: [
      { title: "I want to back up or restore", body: "Use CycleVault to create a user-chosen encrypted backup and validate it before restore.", href: "/app/vault", action: "Open backup & restore" },
      { title: "I want to understand privacy", body: "The Privacy Center shows health-data location, local encryption, notification privacy, partner access, devices and diagnostics.", href: "/app/privacy", action: "Open Privacy Center" },
      { title: "Something technical is wrong", body: "Generate a sanitized diagnostics preview. It intentionally excludes period dates, symptoms, notes, sexual activity and fertility/pregnancy payloads.", href: "/app/diagnostics", action: "Open Diagnostics" },
    ],
  },
  "about": {
    intro: "Sreva is one privacy-first cycle and wellness companion across Android, iOS and Web, with platform-specific adapters but one health-data meaning.",
    sections: [
      { title: "One product contract", body: "Cycle semantics, prediction rules, reminder meaning, privacy boundaries, schemas and crypto/sync formats are shared across clients.", href: "/features", action: "Explore capabilities" },
      { title: "No-account equality", body: "Core tracking, logging, predictions, insights, reminders, reports, privacy and local vault features do not require an account.", href: "/app/home", action: "Continue without account" },
      { title: "Health boundaries", body: "Sreva supports personal tracking and estimates but does not silently turn them into diagnosis, treatment or certified contraception claims.", href: "/terms", action: "Read product boundaries" },
    ],
  },
  "release-notes": {
    intro: "The current Web release focuses on complete feature discovery, structured local workspaces, product-depth evidence and truthful provider/platform boundaries.",
    sections: [
      { title: "Complete navigation", body: "The More hub and public capability catalogue expose the launch contract instead of leaving secondary routes hidden.", href: "/features", action: "Browse the catalogue" },
      { title: "Product-depth closure", body: "Structured logging, prediction history, personal reminders, privacy/app-lock, diagnostics and explicit account/sync states are integrated into the Web product.", href: "/app/more", action: "Open all features" },
      { title: "Fail-closed release evidence", body: "Web source is scanned for backlog markers and the product-completeness gate checks 258 launch IDs plus deeper user-story surfaces.", href: "/security", action: "Read security" },
    ],
  },
  "terms": {
    intro: "Sreva is a personal tracking and wellness product. Its estimates and observations are not a substitute for professional medical diagnosis, treatment or emergency care.",
    sections: [
      { title: "Predictions are estimates", body: "Expected dates, PMS, ovulation or fertile-window estimates can be uncertain and must not be treated as guarantees.", href: "/predictions", action: "Understand predictions" },
      { title: "No certified contraception claim", body: "The initial release does not claim contraceptive effectiveness or a certified avoid-pregnancy method.", href: "/reproductive-health", action: "Review reproductive-health boundaries" },
      { title: "You control exports and sharing", body: "Doctor reports, partner summaries and diagnostics require explicit user actions and have separate scopes.", href: "/privacy", action: "Review privacy" },
    ],
  },
  "security/report": {
    intro: "Report security issues with the minimum technical information needed to reproduce the problem. Do not attach real menstrual, fertility, pregnancy, sexual-activity or medication records.",
    sections: [
      { title: "What to include", body: "Describe the affected route/version, browser or device, reproducible technical steps and observed security impact.", href: "/app/diagnostics", action: "Generate sanitized diagnostics" },
      { title: "What not to include", body: "Do not share vault keys, recovery secrets, passphrases or real health payloads in a security report." },
      { title: "Preserve user privacy", body: "Use synthetic values when a reproduction needs example data. Sreva diagnostics are designed around allowlisted technical state.", href: "/security", action: "Back to Security" },
    ],
  },
  "security-report": {
    intro: "This legacy route is retained for compatibility. The canonical security-reporting page is /security/report.",
    sections: [{ title: "Use the canonical route", body: "Security reporting guidance lives at the architecture-approved nested route.", href: "/security/report", action: "Open security reporting" }],
  },
};
