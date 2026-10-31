import SpeedTest from '@cloudflare/speedtest';

export type Metrics = { download: number | null; upload: number | null; ping: number | null; jitter: number | null; loadedPing: number | null; score: number | null; testedAt: string | null };
export const emptyMetrics: Metrics = { download: null, upload: null, ping: null, jitter: null, loadedPing: null, score: null, testedAt: null };
const finite = (value: unknown) => typeof value === 'number' && Number.isFinite(value) ? value : null;
const cap = (n: number) => Math.max(0, Math.min(100, n));
export function scoreConnection(m: Metrics) {
  if (m.download === null || m.upload === null || m.ping === null) return null;
  const down = cap(Math.log1p(m.download) / Math.log1p(100) * 100);
  const up = cap(Math.log1p(m.upload) / Math.log1p(40) * 100);
  const latency = cap(100 - Math.max(0, m.ping - 10) * 1.25);
  const stability = m.jitter === null ? 50 : cap(100 - m.jitter * 4);
  return Math.round(down * .38 + up * .24 + latency * .25 + stability * .13);
}
export function readMetrics(results: InstanceType<typeof SpeedTest>['results']): Metrics {
  const download = finite(results.getDownloadBandwidth());
  const upload = finite(results.getUploadBandwidth());
  const m: Metrics = {
    download: download === null ? null : download / 1e6,
    upload: upload === null ? null : upload / 1e6,
    ping: finite(results.getUnloadedLatency()),
    jitter: finite(results.getUnloadedJitter()),
    loadedPing: finite(results.getDownLoadedLatency()),
    score: null, testedAt: null
  };
  m.score = scoreConnection(m);
  return m;
}
export function makeTest() {
  return new SpeedTest({ autoStart: false, bandwidthMinRequestDuration: 0, measurements: [
    { type: 'latency', numPackets: 8 },
    { type: 'download', bytes: 1e5, count: 2 },
    { type: 'download', bytes: 1e6, count: 2 },
    { type: 'download', bytes: 5e6, count: 2 },
    { type: 'upload', bytes: 1e5, count: 2 },
    { type: 'upload', bytes: 1e6, count: 2 },
    { type: 'upload', bytes: 5e6, count: 2 }
  ] });
}
export const format = (n: number | null, digits = 1) => n === null ? '—' : n.toFixed(digits);
export type Rating = 'Excellent' | 'Good' | 'Average' | 'Poor';
export const rate = (value: number): Rating => value >= 82 ? 'Excellent' : value >= 65 ? 'Good' : value >= 42 ? 'Average' : 'Poor';
