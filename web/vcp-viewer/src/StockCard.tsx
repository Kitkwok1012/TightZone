import React from 'react';
import { Stock } from './types';
import { VCPChart } from './VCPChart';
import { formatNumber, formatPercent } from './vcpUtils';

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
  } = stock;

  const getPerfColor = (perf: number) => {
    if (perf > 0) return 'text-green-600';
    if (perf < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow">
      {/* Header */}
      <div className="mb-4">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-xl font-bold text-gray-900">{symbol}</h3>
            <p className="text-sm text-gray-600">{name}</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-gray-900">${close?.toFixed(2) || 'N/A'}</p>
          </div>
        </div>
      </div>

      {/* Chart */}
      <VCPChart stock={stock} />

      {/* Metrics */}
      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-gray-500">Volume</p>
          <p className="font-semibold">{formatNumber(volume, 0)}</p>
        </div>
        <div>
          <p className="text-gray-500">Market Cap</p>
          <p className="font-semibold">{formatNumber(marketCap)}</p>
        </div>
        <div>
          <p className="text-gray-500">Beta</p>
          <p className="font-semibold">{beta?.toFixed(2) || 'N/A'}</p>
        </div>
        <div>
          <p className="text-gray-500">Week</p>
          <p className={`font-semibold ${getPerfColor(perfWeek)}`}>
            {formatPercent(perfWeek)}
          </p>
        </div>
        <div>
          <p className="text-gray-500">Month</p>
          <p className={`font-semibold ${getPerfColor(perfMonth)}`}>
            {formatPercent(perfMonth)}
          </p>
        </div>
        <div>
          <p className="text-gray-500">Year</p>
          <p className={`font-semibold ${getPerfColor(perfYear)}`}>
            {formatPercent(perfYear)}
          </p>
        </div>
      </div>
    </div>
  );
};
