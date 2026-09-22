export type AqiBand = {
  /** EPA category name. */
  label: string;
  /** 3-letter chip label. */
  short: string;
  /** Neon hex used by both the DOM and the WebGL scene. */
  hex: string;
  /** Tailwind-ish rgba glow for CSS. */
  glow: string;
};

const BANDS: { max: number; band: AqiBand }[] = [
  {
    max: 50,
    band: {
      label: "Good",
      short: "GOOD",
      hex: "#22e39a",
      glow: "rgba(34, 227, 154, 0.45)",
    },
  },
  {
    max: 100,
    band: {
      label: "Moderate",
      short: "MOD",
      hex: "#7dd3fc",
      glow: "rgba(125, 211, 252, 0.45)",
    },
  },
  {
    max: 150,
    band: {
      label: "Unhealthy — Sensitive",
      short: "USG",
      hex: "#fbbf24",
      glow: "rgba(251, 191, 36, 0.45)",
    },
  },
  {
    max: 200,
    band: {
      label: "Unhealthy",
      short: "UNH",
      hex: "#fb7185",
      glow: "rgba(251, 113, 133, 0.45)",
    },
  },
  {
    max: 300,
    band: {
      label: "Very Unhealthy",
      short: "VUN",
      hex: "#c084fc",
      glow: "rgba(192, 132, 252, 0.45)",
    },
  },
  {
    max: 500,
    band: {
      label: "Hazardous",
      short: "HZD",
      hex: "#f43f5e",
      glow: "rgba(244, 63, 94, 0.5)",
    },
  },
];

export const AQI_MAX = 500;

export function aqiBand(aqi: number): AqiBand {
  const value = Math.max(0, Math.min(AQI_MAX, Math.round(aqi)));
  for (const entry of BANDS) {
    if (value <= entry.max) return entry.band;
  }
  return BANDS[BANDS.length - 1].band;
}

/** 0..1 severity, used to size/pulse the globe markers. */
export function aqiSeverity(aqi: number) {
  return Math.max(0, Math.min(1, aqi / AQI_MAX));
}

/** Believable synthetic reading: drifts around a node's baseline. */
export function simulateAqi(baseline: number) {
  const drift = (Math.random() - 0.5) * 70;
  const shock = Math.random() < 0.08 ? Math.random() * 120 : 0;
  return Math.max(3, Math.min(AQI_MAX, Math.round(baseline + drift + shock)));
}
