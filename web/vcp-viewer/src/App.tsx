import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Stock } from './types';
import { StockCard } from './StockCard';
import './App.css';

const API_URL = 'http://localhost:5001/api';

function App() {
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [refreshProgress, setRefreshProgress] = useState({ current: 0, total: 0, percentage: 0 });
  const [columnsPerRow, setColumnsPerRow] = useState(3); // 2, 3, or 4 columns
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchStocks = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      setError(null);

      const response = await fetch(`${API_URL}/stocks`);
      if (!response.ok) {
        throw new Error(`Failed to load stocks: ${response.statusText}`);
      }
      const result = await response.json();
      // Handle new response format with nested data
      const stockData = result.data || result;
      setStocks(Array.isArray(stockData) ? stockData : []);
      setLastRefresh(new Date());
      setLoading(false);
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  }, []);

  const refreshData = useCallback(async () => {
    try {
      setRefreshing(true);
      setError(null);
      setRefreshProgress({ current: 0, total: 0, percentage: 0 });

      // Call refresh endpoint (returns immediately)
      const response = await fetch(`${API_URL}/refresh`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error(`Failed to refresh: ${response.statusText}`);
      }

      const result = await response.json();

      // Update with existing data immediately
      if (result.data && Array.isArray(result.data)) {
        setStocks(result.data);
      }

      // Clear any existing poll interval
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }

      // Poll for refresh completion with progress updates
      if (result.refreshInProgress) {
        pollIntervalRef.current = setInterval(async () => {
          try {
            const statusResponse = await fetch(`${API_URL}/refresh/status`);
            if (statusResponse.ok) {
              const status = await statusResponse.json();

              // Update progress
              if (status.progress) {
                setRefreshProgress(status.progress);
              }

              // If refresh is complete, fetch the new data
              if (!status.inProgress) {
                if (pollIntervalRef.current) {
                  clearInterval(pollIntervalRef.current);
                }
                setRefreshing(false);
                setRefreshProgress({ current: 0, total: 0, percentage: 100 });

                // Fetch updated data
                const stocksResponse = await fetch(`${API_URL}/stocks`);
                if (stocksResponse.ok) {
                  const stocksResult = await stocksResponse.json();
                  const stockData = stocksResult.data || stocksResult;
                  setStocks(Array.isArray(stockData) ? stockData : []);
                  setLastRefresh(new Date());
                }
              }
            }
          } catch (err) {
            console.error('Error polling refresh status:', err);
          }
        }, 1000); // Poll every 1 second for smoother progress updates

        // Stop polling after 5 minutes
        setTimeout(() => {
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
          }
          setRefreshing(false);
        }, 300000);
      } else {
        setRefreshing(false);
        setLastRefresh(new Date());
      }
    } catch (err: any) {
      setError(err.message);
      setRefreshing(false);
      setRefreshProgress({ current: 0, total: 0, percentage: 0 });
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchStocks();
  }, [fetchStocks]);

  // Cleanup poll interval on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  const filteredStocks = stocks.filter(
    (stock) =>
      stock.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
      stock.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading VCP stocks...</p>
        </div>
      </div>
    );
  }

  if (error && stocks.length === 0) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 text-lg">Error: {error}</p>
          <p className="text-gray-600 mt-2">Make sure the API server is running on port 5001</p>
          <button
            onClick={() => fetchStocks()}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-lg shadow-lg border-b border-gray-200/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="bg-gradient-to-br from-blue-600 to-indigo-600 p-3 rounded-xl shadow-lg">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 via-blue-900 to-indigo-900 bg-clip-text text-transparent">
                  VCP Stock Scanner
                </h1>
                <p className="text-sm text-gray-600 mt-0.5 flex items-center gap-2">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    {stocks.length} Active Patterns
                  </span>
                  <span className="text-gray-400">•</span>
                  <span>Volatility Contraction Pattern Detection</span>
                </p>
              </div>
            </div>

            <button
              onClick={refreshData}
              disabled={refreshing}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed flex items-center gap-3 shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 disabled:transform-none"
            >
              {refreshing ? (
                <>
                  <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>
                  <span className="font-medium">Scanning Markets...</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span className="font-medium">Refresh Data</span>
                </>
              )}
            </button>
          </div>

          {/* Progress Bar */}
          {refreshing && (
            <div className="mt-4 bg-white rounded-lg p-4 shadow-inner border border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">
                  Fetching price history...
                </span>
                <span className="text-sm font-bold text-blue-600">
                  {refreshProgress.current} / {refreshProgress.total} stocks
                  {refreshProgress.percentage > 0 && ` (${refreshProgress.percentage}%)`}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden shadow-inner">
                <div
                  className="bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 h-3 rounded-full transition-all duration-300 ease-out relative overflow-hidden"
                  style={{ width: `${refreshProgress.percentage}%` }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer"></div>
                </div>
              </div>
            </div>
          )}

          {lastRefresh && !refreshing && (
            <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Last updated: {lastRefresh.toLocaleString()}
            </div>
          )}
        </div>
      </header>

      {/* Search and Controls */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="flex gap-4 items-center">
          {/* Search Bar */}
          <div className="relative flex-1">
            <svg className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search by symbol or company name..."
              className="w-full pl-12 pr-4 py-4 bg-white border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm hover:shadow-md transition-shadow duration-200 text-gray-700 placeholder-gray-400"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Column Selector */}
          <div className="flex items-center gap-3 bg-white border-2 border-gray-200 rounded-xl px-4 py-2 shadow-sm">
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 16a1 1 0 011-1h4a1 1 0 011 1v3a1 1 0 01-1 1H5a1 1 0 01-1-1v-3zM14 16a1 1 0 011-1h4a1 1 0 011 1v3a1 1 0 01-1 1h-4a1 1 0 01-1-1v-3z" />
            </svg>
            <div className="flex gap-1">
              {[2, 3, 4].map((cols) => (
                <button
                  key={cols}
                  onClick={() => setColumnsPerRow(cols)}
                  className={`px-3 py-1.5 rounded-lg font-medium text-sm transition-all duration-200 ${
                    columnsPerRow === cols
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {cols}
                </button>
              ))}
            </div>
            <span className="text-sm text-gray-600 font-medium whitespace-nowrap">per row</span>
          </div>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="max-w-7xl mx-auto px-6 pb-4">
          <div className="bg-red-50/80 backdrop-blur border-l-4 border-red-500 rounded-xl p-4 shadow-md">
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 text-red-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-red-700 font-medium">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Stock Grid */}
      <main className="max-w-7xl mx-auto px-6 pb-12">
        {filteredStocks.length === 0 ? (
          <div className="text-center py-20">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-200 rounded-full mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <p className="text-gray-500 text-lg">No stocks found matching "{searchTerm}"</p>
            <p className="text-gray-400 text-sm mt-2">Try adjusting your search terms</p>
          </div>
        ) : (
          <div
            className="grid gap-6"
            style={{
              gridTemplateColumns: `repeat(${columnsPerRow}, minmax(0, 1fr))`
            }}
          >
            {filteredStocks.map((stock) => (
              <StockCard key={stock.symbol} stock={stock} />
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white/80 backdrop-blur-lg border-t border-gray-200/50 mt-12">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="grid md:grid-cols-2 gap-6 text-sm">
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-4 border border-amber-200/50">
              <div className="flex items-start gap-3">
                <div className="bg-amber-400 rounded-lg p-2">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
                <div>
                  <p className="font-semibold text-amber-900 mb-1">VCP Pattern Zones</p>
                  <p className="text-amber-700">Highlighted in <span className="font-bold text-amber-600">yellow/orange</span> zones showing volatility contraction phases</p>
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-gray-50 to-slate-50 rounded-xl p-4 border border-gray-200/50">
              <div className="flex items-start gap-3">
                <div className="bg-gray-400 rounded-lg p-2">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div>
                  <p className="font-semibold text-gray-900 mb-1">200-Day SMA</p>
                  <p className="text-gray-600"><span className="font-bold text-gray-500">Gray dashed line</span> represents the 200-day Simple Moving Average</p>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-6 text-center text-gray-500 text-xs">
            <p>Built with React • Real-time market data from TradingView & Yahoo Finance</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
