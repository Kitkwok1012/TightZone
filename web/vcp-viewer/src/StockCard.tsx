import React from 'react';
import { Stock } from './types';
import { VCPChart } from './VCPChart';
import { formatNumber, formatPercent, identifyVCPZones, calculateVCPQuality } from './vcpUtils';

interface StockCardProps {
  stock: Stock;
  compact?: boolean;
}

export const StockCard: React.FC<StockCardProps> = ({ stock, compact = false }) => {
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
  const newsItems = (stock.news || []).slice(0, 3);

  const getPerfColor = (perf: number) => {
    if (perf > 0) return 'text-green-600';
    if (perf < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  // Calculate VCP quality
  const vcpZones = identifyVCPZones(priceHistory || []);
  const vcpQuality = calculateVCPQuality(vcpZones);

  const headingClass = compact
    ? 'text-lg font-bold bg-gradient-to-r from-gray-900 to-blue-900 bg-clip-text text-transparent'
    : 'text-xl font-bold bg-gradient-to-r from-gray-900 to-blue-900 bg-clip-text text-transparent';
  const priceClass = compact
    ? 'text-xl font-bold bg-gradient-to-br from-blue-600 to-indigo-600 bg-clip-text text-transparent'
    : 'text-2xl font-bold bg-gradient-to-br from-blue-600 to-indigo-600 bg-clip-text text-transparent';
  const nameClass = compact ? 'text-xs text-gray-600 line-clamp-1' : 'text-sm text-gray-600 line-clamp-1';
  const statsTextClass = compact ? 'text-[0.65rem] text-gray-500' : 'text-xs text-gray-500';
  const cardPadding = compact ? 'p-4' : 'p-5';
  const metricsGapClass = compact ? 'gap-1.5' : 'gap-2';
  const metricsTextClass = compact ? 'text-[0.7rem]' : '';
  const newsTitleClass = compact ? 'text-[0.75rem]' : 'text-sm';
  const newsMetaClass = compact ? 'text-[0.65rem]' : 'text-xs';

  const formatNewsDate = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return '';
    }
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className={`bg-white rounded-xl shadow-lg ${cardPadding} hover:shadow-2xl transition-all duration-300 border border-gray-100 hover:border-blue-200 transform hover:-translate-y-1 ${compact ? 'text-[0.95rem]' : ''}`}>
      {/* Header */}
      <div className="mb-4">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className={headingClass}>{symbol}</h3>
              {/* VCP Quality Badge */}
              <span
                className={
                  compact
                    ? 'inline-flex items-center justify-center w-6 h-6 rounded-full shadow-sm'
                    : 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold text-white shadow-sm'
                }
                style={{ backgroundColor: vcpQuality.color }}
                title={`VCP ${vcpQuality.grade}`}
              >
                {compact ? (
                  <span className="sr-only">{`VCP ${vcpQuality.grade}`}</span>
                ) : (
                  <>VCP {vcpQuality.grade}</>
                )}
              </span>
            </div>
            <p className={nameClass}>{name}</p>
            <div className={`flex items-center gap-2 mt-2 ${statsTextClass}`}>
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
            <p className={priceClass}>${close?.toFixed(2) || 'N/A'}</p>
          </div>
        </div>
      </div>

      {/* Chart */}
      <VCPChart stock={stock} />

      {/* Metrics */}
      <div className={`mt-4 grid grid-cols-3 ${metricsGapClass} ${metricsTextClass}`}>
        <div className="bg-gradient-to-br from-gray-50 to-slate-50 rounded-lg p-2.5 border border-gray-100">
          <p className="text-gray-500 font-medium mb-0.5">Volume</p>
          <p className={`font-bold text-gray-900 ${compact ? 'text-sm' : ''}`}>{formatNumber(volume, 0)}</p>
        </div>
        <div className="bg-gradient-to-br from-gray-50 to-slate-50 rounded-lg p-2.5 border border-gray-100">
          <p className="text-gray-500 font-medium mb-0.5">Market Cap</p>
          <p className={`font-bold text-gray-900 ${compact ? 'text-sm' : ''}`}>{formatNumber(marketCap)}</p>
        </div>
        <div className="bg-gradient-to-br from-gray-50 to-slate-50 rounded-lg p-2.5 border border-gray-100">
          <p className="text-gray-500 font-medium mb-0.5">Beta</p>
          <p className={`font-bold text-gray-900 ${compact ? 'text-sm' : ''}`}>{beta?.toFixed(2) || 'N/A'}</p>
        </div>
      </div>

      {/* Performance */}
      <div className={`mt-3 grid grid-cols-3 ${metricsGapClass} ${metricsTextClass}`}>
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-2.5 border border-blue-100">
          <p className={`text-gray-600 font-medium mb-0.5 ${compact ? 'text-[0.7rem]' : ''}`}>Week</p>
          <p className={`font-bold ${getPerfColor(perfWeek)}`}>
            {formatPercent(perfWeek)}
          </p>
        </div>
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-2.5 border border-blue-100">
          <p className={`text-gray-600 font-medium mb-0.5 ${compact ? 'text-[0.7rem]' : ''}`}>Month</p>
          <p className={`font-bold ${getPerfColor(perfMonth)}`}>
            {formatPercent(perfMonth)}
          </p>
        </div>
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-2.5 border border-blue-100">
          <p className={`text-gray-600 font-medium mb-0.5 ${compact ? 'text-[0.7rem]' : ''}`}>Year</p>
          <p className={`font-bold ${getPerfColor(perfYear)}`}>
            {formatPercent(perfYear)}
          </p>
        </div>
      </div>

      {newsItems.length > 0 && (
        <div className="mt-4 border-t border-gray-100 pt-3">
          <div className="flex items-center gap-2 mb-2">
            <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0l-4 4m4-4l-4-4M5 19V5" />
            </svg>
            <p className={`${newsTitleClass} font-semibold text-gray-800`}>Latest News</p>
          </div>
          <div className="space-y-3">
            {newsItems.map((article, idx) => (
              <a
                key={`${article.url}-${idx}`}
                href={article.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block bg-gray-50 hover:bg-blue-50 rounded-lg p-2 transition-colors"
              >
                <p className={`${newsTitleClass} font-medium text-gray-900 line-clamp-2`}>{article.title}</p>
                <p className={`${newsMetaClass} text-gray-500 mt-1 flex items-center gap-2`}>
                  <span>{article.publisher}</span>
                  {article.publishedAt && (
                    <>
                      <span className="text-gray-300">•</span>
                      <span>{formatNewsDate(article.publishedAt)}</span>
                    </>
                  )}
                </p>
                {article.summary && (
                  <p className={`${newsMetaClass} text-gray-600 mt-1 line-clamp-2`}>{article.summary}</p>
                )}
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
