/**
 * seed-config.mjs
 * Patient archetype definitions, weights, delay reasons, and the live-state
 * distribution plan used by the EWTCS seed scripts.
 *
 * Each archetype is an ordered list of ED stages with min/max durations (mins).
 * Six archetypes produce visibly different analytics:
 *   STANDARD    – full 8-stage journey, moderate timing (~3-5 h)
 *   FAST_TRACK  – minor case, skips Registration (~1-2 h)
 *   CRITICAL    – urgent, skips Registration, fast Treatment (~2-4 h)
 *   COMPLEX     – long Treatment + long Decision Made (~6-14 h)
 *   LONG_STAY   – extended stay with disposition bottleneck (~8-16 h)
 *   QUICK_OUT   – very minor, all stages fast (< 90 min)
 */

export const ARCHETYPES = {
  STANDARD: [
    { s: 'Triage',                min: 10,  max: 35  },
    { s: 'Registration',          min: 15,  max: 45  },
    { s: 'Doctor Assessment',     min: 20,  max: 70  },
    { s: 'Treatment/Observation', min: 90,  max: 280 },
    { s: 'Decision Made',         min: 20,  max: 80  },
    { s: 'Discharge Process',     min: 15,  max: 45  },
    { s: 'Cleaning',              min: 12,  max: 28  },
  ],
  FAST_TRACK: [                                     // minor – skips Registration
    { s: 'Triage',                min: 5,   max: 15  },
    { s: 'Doctor Assessment',     min: 12,  max: 30  },
    { s: 'Decision Made',         min: 8,   max: 25  },
    { s: 'Discharge Process',     min: 8,   max: 20  },
    { s: 'Cleaning',              min: 8,   max: 18  },
  ],
  CRITICAL: [                                       // urgent – straight to Treatment
    { s: 'Triage',                min: 3,   max: 8   },
    { s: 'Doctor Assessment',     min: 8,   max: 20  },
    { s: 'Treatment/Observation', min: 120, max: 260 },
    { s: 'Decision Made',         min: 15,  max: 50  },
    { s: 'Discharge Process',     min: 12,  max: 35  },
    { s: 'Cleaning',              min: 12,  max: 22  },
  ],
  COMPLEX: [                                        // long stay
    { s: 'Triage',                min: 15,  max: 40  },
    { s: 'Registration',          min: 20,  max: 50  },
    { s: 'Doctor Assessment',     min: 30,  max: 90  },
    { s: 'Treatment/Observation', min: 300, max: 600 },
    { s: 'Decision Made',         min: 60,  max: 150 },
    { s: 'Discharge Process',     min: 25,  max: 60  },
    { s: 'Cleaning',              min: 15,  max: 30  },
  ],
  LONG_STAY: [                                      // disposition bottleneck
    { s: 'Triage',                min: 10,  max: 30  },
    { s: 'Registration',          min: 15,  max: 40  },
    { s: 'Doctor Assessment',     min: 25,  max: 75  },
    { s: 'Treatment/Observation', min: 240, max: 480 },
    { s: 'Decision Made',         min: 120, max: 300, bottleneck: true },
    { s: 'Discharge Process',     min: 20,  max: 50  },
    { s: 'Cleaning',              min: 12,  max: 25  },
  ],
  QUICK_OUT: [                                      // very minor – all stages fast
    { s: 'Triage',                min: 5,   max: 12  },
    { s: 'Registration',          min: 8,   max: 18  },
    { s: 'Doctor Assessment',     min: 10,  max: 22  },
    { s: 'Decision Made',         min: 5,   max: 15  },
    { s: 'Discharge Process',     min: 5,   max: 12  },
    { s: 'Cleaning',              min: 8,   max: 15  },
  ],
};

/** Weighted distribution for historical patient generation. */
export const ARCHETYPE_WEIGHTS = [
  { type: 'STANDARD',   weight: 35 },
  { type: 'FAST_TRACK', weight: 25 },
  { type: 'CRITICAL',   weight: 10 },
  { type: 'COMPLEX',    weight: 12 },
  { type: 'LONG_STAY',  weight: 8  },
  { type: 'QUICK_OUT',  weight: 10 },
];

/** Returns a random archetype name according to ARCHETYPE_WEIGHTS. */
export function pickArchetype() {
  const total = ARCHETYPE_WEIGHTS.reduce((s, w) => s + w.weight, 0);
  let r = Math.random() * total;
  for (const w of ARCHETYPE_WEIGHTS) {
    r -= w.weight;
    if (r <= 0) return w.type;
  }
  return 'STANDARD';
}

export const DELAY_REASONS = [
  'no_bed_upstairs', 'awaiting_transport', 'family_consent',
  'awaiting_specialist', 'other',
];

/**
 * Live-state distribution plan — scaled for 30 ER beds.
 * 27 beds are placed into active stages; 3 remain Empty (realistic vacancy).
 * Ensures every stage has multiple occupied beds for a readable dashboard.
 * count × hours-ago range — overdue/bottleneck flags drive delay inserts.
 */
export const LIVE_PLAN = [
  { stage: 'Triage',                count: 4, minH: 0.05, maxH: 0.4  },
  { stage: 'Triage',                count: 2, minH: 0.4,  maxH: 0.9, overdue: true },
  { stage: 'Registration',          count: 3, minH: 0.1,  maxH: 0.7  },
  { stage: 'Doctor Assessment',     count: 3, minH: 0.2,  maxH: 1.2  },
  { stage: 'Doctor Assessment',     count: 2, minH: 1.2,  maxH: 1.8, overdue: true },
  { stage: 'Treatment/Observation', count: 4, minH: 1.0,  maxH: 4.0  },
  { stage: 'Treatment/Observation', count: 2, minH: 6.0,  maxH: 10.0, overdue: true },
  { stage: 'Decision Made',         count: 2, minH: 0.3,  maxH: 1.5  },
  { stage: 'Decision Made',         count: 1, minH: 2.5,  maxH: 5.0, bottleneck: true },
  { stage: 'Discharge Process',     count: 2, minH: 0.1,  maxH: 0.7  },
  { stage: 'Cleaning',              count: 2, minH: 0.05, maxH: 0.4  },
  // Total: 27 beds active — 3 remain Empty (realistic for a busy 30-bed ER ward)
];
