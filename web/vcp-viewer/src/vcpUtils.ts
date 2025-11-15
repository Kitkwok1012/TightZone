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

export interface VCPQuality {
  score: number; // 0-100
  grade: 'A+' | 'A' | 'B+' | 'B' | 'C';
  contractionRate: number;
  numberOfZones: number;
  color: string;
}

export function calculateVCPQuality(zones: VCPZone[]): VCPQuality {
  if (zones.length === 0) {
    return { score: 0, grade: 'C', contractionRate: 0, numberOfZones: 0, color: '#9ca3af' };
  }

  // Calculate contraction rate (how much each zone contracts compared to previous)
  let totalContraction = 0;
  for (let i = 1; i < zones.length; i++) {
    const prevRange = zones[i - 1].high - zones[i - 1].low;
    const currRange = zones[i].high - zones[i].low;
    if (prevRange > 0) {
      const contractionPercent = ((prevRange - currRange) / prevRange) * 100;
      totalContraction += contractionPercent;
    }
  }

  const avgContractionRate = zones.length > 1 ? totalContraction / (zones.length - 1) : 0;

  // Calculate base score
  let score = 0;

  // More zones = better VCP (max 40 points)
  score += Math.min(zones.length * 10, 40);

  // Higher contraction rate = better VCP (max 60 points)
  score += Math.min(avgContractionRate * 2, 60);

  // Cap at 100
  score = Math.min(Math.max(score, 0), 100);

  // Determine grade
  let grade: VCPQuality['grade'];
  let color: string;
  if (score >= 90) {
    grade = 'A+';
    color = '#10b981'; // green-500
  } else if (score >= 80) {
    grade = 'A';
    color = '#22c55e'; // green-400
  } else if (score >= 70) {
    grade = 'B+';
    color = '#eab308'; // yellow-500
  } else if (score >= 60) {
    grade = 'B';
    color = '#f59e0b'; // amber-500
  } else {
    grade = 'C';
    color = '#ef4444'; // red-500
  }

  return {
    score: Math.round(score),
    grade,
    contractionRate: avgContractionRate,
    numberOfZones: zones.length,
    color,
  };
}
