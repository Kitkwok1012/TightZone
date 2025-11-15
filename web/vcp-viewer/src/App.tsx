import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Stock } from './types';
import { StockCard } from './StockCard';
import './App.css';

const API_URL = 'http://localhost:5001/api';

const REFRESH_INTERVALS = [
  { label: 'Off', value: 0 },
  { label: '10s', value: 10 },
  { label: '20s', value: 20 },
  { label: '30s', value: 30 },
  { label: '1min', value: 60 },
  { label: '5min', value: 300 },
];

function App() {
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [autoRefreshInterval, setAutoRefreshInterval] = useState(0);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [countdown, setCountdown] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);

  const fetchStocks = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      setError(null);

      const response = await fetch(`${API_URL}/stocks`);
      if (!response.ok) {
        throw new Error(`Failed to load stocks: ${response.statusText}`);
      }
      const data: Stock[] = await response.json();
      setStocks(data);
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

      const response = await fetch(`${API_URL}/refresh`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error(`Failed to refresh: ${response.statusText}`);
      }

      const result = await response.json();
      setStocks(result.data);
      setLastRefresh(new Date());
      setRefreshing(false);
    } catch (err: any) {
      setError(err.message);
      setRefreshing(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchStocks();
  }, [fetchStocks]);

  // Auto-refresh logic
  useEffect(() => {
    // Clear existing intervals
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
    }

    if (autoRefreshInterval > 0) {
      setCountdown(autoRefreshInterval);

      // Refresh data at the specified interval
      intervalRef.current = setInterval(() => {
        refreshData();
        setCountdown(autoRefreshInterval);
      }, autoRefreshInterval * 1000);

      // Countdown timer
      countdownRef.current = setInterval(() => {
        setCountdown((prev) => (prev > 1 ? prev - 1 : autoRefreshInterval));
      }, 1000);
    } else {
      setCountdown(0);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [autoRefreshInterval, refreshData]);

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
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">VCP Stock Scanner</h1>
              <p className="text-gray-600 mt-1">
                Volatility Contraction Pattern - {stocks.length} stocks found
              </p>
            </div>

            {/* Auto-refresh controls */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600">Auto-refresh:</label>
                <select
                  value={autoRefreshInterval}
                  onChange={(e) => setAutoRefreshInterval(Number(e.target.value))}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                >
                  {REFRESH_INTERVALS.map((interval) => (
                    <option key={interval.value} value={interval.value}>
                      {interval.label}
                    </option>
                  ))}
                </select>
              </div>

              {autoRefreshInterval > 0 && countdown > 0 && (
                <div className="text-sm text-gray-600">
                  Next refresh in: <span className="font-semibold">{countdown}s</span>
                </div>
              )}

              <button
                onClick={refreshData}
                disabled={refreshing}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {refreshing ? (
                  <>
                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                    Refreshing...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Refresh Now
                  </>
                )}
              </button>
            </div>
          </div>

          {lastRefresh && (
            <p className="text-xs text-gray-500 mt-2">
              Last updated: {lastRefresh.toLocaleString()}
            </p>
          )}
        </div>
      </header>

      {/* Search */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <input
          type="text"
          placeholder="Search by symbol or name..."
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Error banner */}
      {error && (
        <div className="max-w-7xl mx-auto px-4 pb-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-600">{error}</p>
          </div>
        </div>
      )}

      {/* Stock Grid */}
      <main className="max-w-7xl mx-auto px-4 pb-8">
        {filteredStocks.length === 0 ? (
          <div className="text-center text-gray-600 py-12">
            No stocks found matching "{searchTerm}"
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredStocks.map((stock) => (
              <StockCard key={stock.symbol} stock={stock} />
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t mt-12">
        <div className="max-w-7xl mx-auto px-4 py-6 text-center text-gray-600 text-sm">
          <p>
            VCP patterns are highlighted in{' '}
            <span className="text-yellow-600 font-semibold">yellow/orange</span> zones
          </p>
          <p className="mt-1">
            Gray dashed line represents the 200-day Simple Moving Average (SMA200)
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;
