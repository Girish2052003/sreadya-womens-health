export type PublicTopicSection = {
  id: string;
  href?: string;
};

export type PublicTopic = {
  id: string;
  sections: PublicTopicSection[];
  hasBoundary?: boolean;
};

export const publicTopicContent: Record<string, PublicTopic> = {
  "how-it-works": {
    "id": "how-it-works",
    "sections": [
      {
        "id": "section1",
        "href": "/app/home"
      },
      {
        "id": "section2",
        "href": "/predictions"
      },
      {
        "id": "section3",
        "href": "/sync"
      }
    ]
  },
  "cycle-tracking": {
    "id": "cycle-tracking",
    "sections": [
      {
        "id": "section1",
        "href": "/app/cycle"
      },
      {
        "id": "section2",
        "href": "/app/reproductive-health"
      },
      {
        "id": "section3",
        "href": "/app/calendar"
      }
    ]
  },
  "predictions": {
    "id": "predictions",
    "sections": [
      {
        "id": "section1",
        "href": "/app/predictions"
      },
      {
        "id": "section2",
        "href": "/app/predictions"
      },
      {
        "id": "section3",
        "href": "/app/life-stage"
      }
    ]
  },
  "reminders": {
    "id": "reminders",
    "sections": [
      {
        "id": "section1",
        "href": "/app/reminders"
      },
      {
        "id": "section2",
        "href": "/app/reminders"
      },
      {
        "id": "section3",
        "href": "/app/reminders"
      }
    ]
  },
  "insights": {
    "id": "insights",
    "sections": [
      {
        "id": "section1",
        "href": "/app/insights"
      },
      {
        "id": "section2",
        "href": "/app/insights"
      },
      {
        "id": "section3",
        "href": "/app/insights"
      }
    ]
  },
  "life-stages": {
    "id": "life-stages",
    "sections": [
      {
        "id": "section1",
        "href": "/app/life-stage"
      },
      {
        "id": "section2",
        "href": "/app/predictions"
      },
      {
        "id": "section3",
        "href": "/privacy"
      }
    ]
  },
  "doctor-reports": {
    "id": "doctor-reports",
    "sections": [
      {
        "id": "section1",
        "href": "/app/reports"
      },
      {
        "id": "section2",
        "href": "/app/reports"
      },
      {
        "id": "section3",
        "href": "/privacy"
      }
    ]
  },
  "privacy": {
    "id": "privacy",
    "sections": [
      {
        "id": "section1",
        "href": "/app/vault"
      },
      {
        "id": "section2",
        "href": "/app/settings"
      },
      {
        "id": "section3",
        "href": "/app/privacy"
      }
    ]
  },
  "security": {
    "id": "security",
    "sections": [
      {
        "id": "section1",
        "href": "/app/vault"
      },
      {
        "id": "section2",
        "href": "/sync"
      },
      {
        "id": "section3",
        "href": "/security/report"
      }
    ]
  },
  "sync": {
    "id": "sync",
    "sections": [
      {
        "id": "section1",
        "href": "/app/sync"
      },
      {
        "id": "section2",
        "href": "/security"
      },
      {
        "id": "section3",
        "href": "/app/devices"
      }
    ],
    "hasBoundary": true
  },
  "accessibility": {
    "id": "accessibility",
    "sections": [
      {
        "id": "section1",
        "href": "/app/settings"
      },
      {
        "id": "section2",
        "href": "/app/settings"
      },
      {
        "id": "section3",
        "href": "/install/pwa"
      }
    ]
  },
  "download": {
    "id": "download",
    "sections": [
      {
        "id": "section1",
        "href": "/install/pwa"
      },
      {
        "id": "section2",
        "href": "/install/android"
      },
      {
        "id": "section3",
        "href": "/install/iphone"
      }
    ]
  },
  "help": {
    "id": "help",
    "sections": [
      {
        "id": "section1",
        "href": "/app/vault"
      },
      {
        "id": "section2",
        "href": "/app/privacy"
      },
      {
        "id": "section3",
        "href": "/app/diagnostics"
      }
    ]
  },
  "about": {
    "id": "about",
    "sections": [
      {
        "id": "section1",
        "href": "/features"
      },
      {
        "id": "section2",
        "href": "/app/home"
      },
      {
        "id": "section3",
        "href": "/terms"
      }
    ]
  },
  "release-notes": {
    "id": "release-notes",
    "sections": [
      {
        "id": "section1",
        "href": "/features"
      },
      {
        "id": "section2",
        "href": "/app/more"
      },
      {
        "id": "section3",
        "href": "/security"
      }
    ]
  },
  "terms": {
    "id": "terms",
    "sections": [
      {
        "id": "section1",
        "href": "/predictions"
      },
      {
        "id": "section2",
        "href": "/app/reproductive-health"
      },
      {
        "id": "section3",
        "href": "/privacy"
      }
    ]
  },
  "security/report": {
    "id": "security.report",
    "sections": [
      {
        "id": "section1",
        "href": "/app/diagnostics"
      },
      {
        "id": "section2"
      },
      {
        "id": "section3",
        "href": "/security"
      }
    ]
  },
  "security-report": {
    "id": "security-report",
    "sections": [
      {
        "id": "section1",
        "href": "/security/report"
      }
    ]
  }
} as const;
