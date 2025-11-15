import React from 'react';
import { Stock } from './types';
import { VCPChart } from './VCPChart';
import { formatNumber, formatPercent, identifyVCPZones, calculateVCPQuality } from './vcpUtils';

interface StockCardProps {
  stock: Stock;
}

export const StockCard: React.FC<StockCardProps> = ({ stock }) => {
  const {
    symbol,
    name,
    close,
    volume,
    marketCap,
    beta,
    perfWeek,
    perfMonth,
    perfYear,
    priceHistory,
  } = stock;

  const getPerfColor = (perf: number) => {
    if (perf > 0) return 'text-green-600';
    if (perf < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  // Calculate VCP quality
  const vcpZones = identifyVCPZones(priceHistory || []);
  const vcpQuality = calculateVCPQuality(vcpZones);

  return (
    <div className="bg-white rounded-xl shadow-lg p-5 hover:shadow-2xl transition-all duration-300 border border-gray-100 hover:border-blue-200 transform hover:-translate-y-1">
      {/* Header */}
      <div className="mb-4">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-xl font-bold bg-gradient-to-r from-gray-900 to-blue-900 bg-clip-text text-transparent">
                {symbol}
              </h3>
              {/* VCP Quality Badge */}
              <span
                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold text-white shadow-sm"
                style={{ backgroundColor: vcpQuality.color }}
              >
                VCP {vcpQuality.grade}
              </span>
            </div>
            <p className="text-sm text-gray-600 line-clamp-1">{name}</p>
            <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
              <div className="flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <span>{vcpQuality.numberOfZones} Zones</span>
              </div>
              <span className="text-gray-300">•</span>
              <span>{vcpQuality.contractionRate.toFixed(1)}% Contraction</span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold bg-gradient-to-br from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              ${close?.toFixed(2) || 'N/A'}
            </p>
          </div>
        </div>
      </div>

      {/* Chart */}
      <VCPChart stock={stock} />

      {/* Metrics */}
      <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
        <div className="bg-gradient-to-br from-gray-50 to-slate-50 rounded-lg p-2.5 border border-gray-100">
          <p className="text-gray-500 font-medium mb-0.5">Volume</p>
          <p className="font-bold text-gray-900">{formatNumber(volume, 0)}</p>
        </div>
        <div className="bg-gradient-to-br from-gray-50 to-slate-50 rounded-lg p-2.5 border border-gray-100">
          <p className="text-gray-500 font-medium mb-0.5">Market Cap</p>
          <p className="font-bold text-gray-900">{formatNumber(marketCap)}</p>
        </div>
        <div className="bg-gradient-to-br from-gray-50 to-slate-50 rounded-lg p-2.5 border border-gray-100">
          <p className="text-gray-500 font-medium mb-0.5">Beta</p>
          <p className="font-bold text-gray-900">{beta?.toFixed(2) || 'N/A'}</p>
        </div>
      </div>

      {/* Performance */}
      <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-2.5 border border-blue-100">
          <p className="text-gray-600 font-medium mb-0.5">Week</p>
          <p className={`font-bold ${getPerfColor(perfWeek)}`}>
            {formatPercent(perfWeek)}
          </p>
        </div>
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-2.5 border border-blue-100">
          <p className="text-gray-600 font-medium mb-0.5">Month</p>
          <p className={`font-bold ${getPerfColor(perfMonth)}`}>
            {formatPercent(perfMonth)}
          </p>
        </div>
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-2.5 border border-blue-100">
          <p className="text-gray-600 font-medium mb-0.5">Year</p>
          <p className={`font-bold ${getPerfColor(perfYear)}`}>
            {formatPercent(perfYear)}
          </p>
        </div>
      </div>
    </div>
  );
};
