/**
 * Mocked node registry.
 *
 * The MVP keeps no off-chain database, so sensor geography is hardcoded here.
 * Every entry mirrors what a real `SensorNode` PDA would expose, which keeps the
 * swap to a live index a one-file change.
 */
export type SensorSeed = {
  id: string;
  city: string;
  region: string;
  lat: number;
  lng: number;
  /** Rough annual mean AQI — the baseline synthetic readings drift around. */
  baseline: number;
};

export const SENSOR_NETWORK: SensorSeed[] = [
  { id: "DEL", city: "Delhi", region: "IN", lat: 28.61, lng: 77.21, baseline: 168 },
  { id: "LHR", city: "Lahore", region: "PK", lat: 31.55, lng: 74.34, baseline: 174 },
  { id: "DHK", city: "Dhaka", region: "BD", lat: 23.81, lng: 90.41, baseline: 161 },
  { id: "KOL", city: "Kolkata", region: "IN", lat: 22.57, lng: 88.36, baseline: 143 },
  { id: "BOM", city: "Mumbai", region: "IN", lat: 19.08, lng: 72.88, baseline: 131 },
  { id: "KHI", city: "Karachi", region: "PK", lat: 24.86, lng: 67.01, baseline: 138 },
  { id: "THR", city: "Tehran", region: "IR", lat: 35.69, lng: 51.39, baseline: 127 },
  { id: "BEJ", city: "Beijing", region: "CN", lat: 39.9, lng: 116.41, baseline: 118 },
  { id: "ULN", city: "Ulaanbaatar", region: "MN", lat: 47.89, lng: 106.91, baseline: 121 },
  { id: "JKT", city: "Jakarta", region: "ID", lat: -6.2, lng: 106.85, baseline: 108 },
  { id: "CAI", city: "Cairo", region: "EG", lat: 30.04, lng: 31.24, baseline: 133 },
  { id: "LOS", city: "Lagos", region: "NG", lat: 6.52, lng: 3.38, baseline: 101 },
  { id: "SCL", city: "Santiago", region: "CL", lat: -33.45, lng: -70.67, baseline: 82 },
  { id: "MEX", city: "Mexico City", region: "MX", lat: 19.43, lng: -99.13, baseline: 96 },
  { id: "SAO", city: "São Paulo", region: "BR", lat: -23.55, lng: -46.63, baseline: 71 },
  { id: "HOU", city: "Houston", region: "US", lat: 29.76, lng: -95.37, baseline: 61 },
  { id: "LAX", city: "Los Angeles", region: "US", lat: 34.05, lng: -118.24, baseline: 66 },
  { id: "BKK", city: "Bangkok", region: "TH", lat: 13.76, lng: 100.5, baseline: 87 },
  { id: "SEU", city: "Seoul", region: "KR", lat: 37.57, lng: 126.98, baseline: 57 },
  { id: "IST", city: "Istanbul", region: "TR", lat: 41.01, lng: 28.98, baseline: 69 },
  { id: "DBX", city: "Dubai", region: "AE", lat: 25.2, lng: 55.27, baseline: 91 },
  { id: "JNB", city: "Johannesburg", region: "ZA", lat: -26.2, lng: 28.05, baseline: 64 },
  { id: "NYC", city: "New York", region: "US", lat: 40.71, lng: -74.01, baseline: 41 },
  { id: "CHI", city: "Chicago", region: "US", lat: 41.88, lng: -87.63, baseline: 44 },
  { id: "SFO", city: "San Francisco", region: "US", lat: 37.77, lng: -122.42, baseline: 47 },
  { id: "TYO", city: "Tokyo", region: "JP", lat: 35.68, lng: 139.69, baseline: 37 },
  { id: "SIN", city: "Singapore", region: "SG", lat: 1.35, lng: 103.82, baseline: 43 },
  { id: "PAR", city: "Paris", region: "FR", lat: 48.86, lng: 2.35, baseline: 36 },
  { id: "LON", city: "London", region: "GB", lat: 51.51, lng: -0.13, baseline: 31 },
  { id: "BER", city: "Berlin", region: "DE", lat: 52.52, lng: 13.41, baseline: 25 },
  { id: "MAD", city: "Madrid", region: "ES", lat: 40.42, lng: -3.7, baseline: 29 },
  { id: "NBO", city: "Nairobi", region: "KE", lat: -1.29, lng: 36.82, baseline: 34 },
  { id: "STO", city: "Stockholm", region: "SE", lat: 59.33, lng: 18.07, baseline: 15 },
  { id: "REY", city: "Reykjavík", region: "IS", lat: 64.15, lng: -21.94, baseline: 9 },
  { id: "SYD", city: "Sydney", region: "AU", lat: -33.87, lng: 151.21, baseline: 21 },
  { id: "AKL", city: "Auckland", region: "NZ", lat: -36.85, lng: 174.76, baseline: 12 },
];

export const NETWORK_SIZE = SENSOR_NETWORK.length;

export function nodeById(id: string) {
  return SENSOR_NETWORK.find((node) => node.id === id) ?? null;
}

/** Stable "your node" home city, derived from the wallet address. */
export function homeNodeFor(address: string): SensorSeed {
  let acc = 0;
  for (let i = 0; i < address.length; i += 1) acc = (acc * 31 + address.charCodeAt(i)) >>> 0;
  return SENSOR_NETWORK[acc % SENSOR_NETWORK.length];
}

/** Station code for a deployed virtual sensor. */
export function stationCode(address: string) {
  const clean = address.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  return `ATM-${clean.slice(0, 3) || "000"}`;
}
