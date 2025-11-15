import { PriceBar, VCPZone } from './types';

export function identifyVCPZones(series: PriceBar[], segments: number = 4): VCPZone[] {
  const count = series.length;
  if (count < segments * 5) {
    return [];
  }

  const window = Math.max(Math.floor(count / segments), 1);
  const startOffset = Math.max(count - segments * window, 0);

  interface Window {
    start: number;
    end: number;
    high: number;
    low: number;
    range: number;
  }

  const windows: Window[] = [];
  for (let idx = 0; idx < segments; idx++) {
    const start = startOffset + idx * window;
    const end = Math.min(start + window, count);
    if (end - start < 2) {
      continue;
    }

    const slice = series.slice(start, end);
    const highs = Math.max(...slice.map(p => p.close));
    const lows = Math.min(...slice.map(p => p.close));

    windows.push({
      start,
      end: end - 1,
      high: highs,
      low: lows,
      range: highs - lows,
    });
  }

  const contracted: VCPZone[] = [];
  let previousRange: number | null = null;

  for (const w of windows) {
    if (w.range <= 0) {
      continue;
    }
    if (previousRange === null || w.range < previousRange) {
      contracted.push({
        start: w.start,
        end: w.end,
        high: w.high,
        low: w.low,
      });
      previousRange = w.range;
    }
  }

  return contracted;
}

export function formatNumber(num: number, decimals: number = 2): string {
  if (num >= 1e12) {
    return `$${(num / 1e12).toFixed(decimals)}T`;
  } else if (num >= 1e9) {
    return `$${(num / 1e9).toFixed(decimals)}B`;
  } else if (num >= 1e6) {
    return `$${(num / 1e6).toFixed(decimals)}M`;
  } else if (num >= 1e3) {
    return `$${(num / 1e3).toFixed(decimals)}K`;
  }
  return `$${num.toFixed(decimals)}`;
}

export function formatPercent(num: number): string {
  const sign = num >= 0 ? '+' : '';
  return `${sign}${num.toFixed(2)}%`;
}
