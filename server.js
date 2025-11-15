const express = require('express');
const cors = require('cors');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

const app = express();
const PORT = 5001;

app.use(cors());
app.use(express.json());

// Path to the data file
const DATA_FILE = path.join(__dirname, 'web/vcp-viewer/public/vcp_stocks.json');
const CACHE_FILE = path.join(__dirname, 'vcp_cache.json');
const NEWS_ENDPOINT = 'https://query1.finance.yahoo.com/v1/finance/search';
const NEWS_LOOKBACK_DAYS = 3;
const NEWS_CACHE_TTL_MS = 1000 * 60 * 30; // 30 minutes
const NEWS_LIMIT = 3;
const newsCache = new Map();

const normalizeSymbol = (symbol) => {
  if (!symbol || typeof symbol !== 'string') return '';
  return symbol.split(':').pop();
};

async function fetchSymbolNews(symbol) {
  const ticker = normalizeSymbol(symbol);
  if (!ticker) return [];

  const cached = newsCache.get(ticker);
  const now = Date.now();
  if (cached && now - cached.timestamp < NEWS_CACHE_TTL_MS) {
    return cached.articles;
  }

  const params = new URLSearchParams({
    q: ticker,
    lang: 'en-US',
    region: 'US',
    quotesCount: '0',
    newsCount: String(NEWS_LIMIT),
  });

  try {
    const response = await fetch(`${NEWS_ENDPOINT}?${params.toString()}`, {
      headers: {
        'User-Agent': 'TightZone/1.0 (+https://github.com/Kitkwok1012/TightZone)',
        Accept: 'application/json',
      },
      timeout: 5000,
    });

    if (!response.ok) {
      throw new Error(`News request failed with status ${response.status}`);
    }

    const payload = await response.json();
    const items = Array.isArray(payload.news) ? payload.news : [];
    const cutoff = Date.now() - NEWS_LOOKBACK_DAYS * 24 * 60 * 60 * 1000;
    const articles = [];

    for (const item of items) {
      if (!item || typeof item !== 'object') continue;
      const title = item.title;
      const link = item.link;
      if (!title || !link) continue;

      const publisher = item.publisher || (item.provider && item.provider.displayName) || 'Unknown';
      const summary = item.summary || '';
      const publishedMs = typeof item.providerPublishTime === 'number' ? item.providerPublishTime * 1000 : null;

      if (!publishedMs || publishedMs < cutoff) continue;

      articles.push({
        title,
        url: link,
        publisher,
        summary,
        publishedAt: new Date(publishedMs).toISOString(),
      });

      if (articles.length >= NEWS_LIMIT) break;
    }

    newsCache.set(ticker, { timestamp: now, articles });
    return articles;
  } catch (error) {
    console.error(`Failed to fetch news for ${symbol}:`, error.message);
    newsCache.set(ticker, { timestamp: now, articles: [] });
    return [];
  }
}

function hasRecentNews(articles) {
  if (!Array.isArray(articles) || articles.length === 0) return false;
  const cutoff = Date.now() - NEWS_LOOKBACK_DAYS * 24 * 60 * 60 * 1000;
  return articles.some((article) => {
    const published = new Date(article.publishedAt).getTime();
    return !Number.isNaN(published) && published >= cutoff;
  });
}

async function ensureNewsForStocks(stocks) {
  if (!Array.isArray(stocks)) return;
  const tasks = stocks.map(async (stock) => {
    if (!stock || typeof stock !== 'object') return;
    if (hasRecentNews(stock.news)) return;
    stock.news = await fetchSymbolNews(stock.symbol);
  });

  await Promise.all(tasks);
}

// Track refresh status
let refreshStatus = {
  inProgress: false,
  lastUpdated: null,
  lastError: null,
  progress: {
    current: 0,
    total: 0,
    percentage: 0
  }
};

// Load cached metadata
function loadCacheMetadata() {
  try {
    if (fs.existsSync(CACHE_FILE)) {
      const cache = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
      refreshStatus.lastUpdated = cache.lastUpdated;
    }
  } catch (err) {
    console.error('Failed to load cache metadata:', err.message);
  }
}

// Save cache metadata
function saveCacheMetadata() {
  try {
    fs.writeFileSync(CACHE_FILE, JSON.stringify({
      lastUpdated: refreshStatus.lastUpdated
    }, null, 2));
  } catch (err) {
    console.error('Failed to save cache metadata:', err.message);
  }
}

// Initialize cache metadata on startup
loadCacheMetadata();

// Get current VCP stocks data
app.get('/api/stocks', async (req, res) => {
  // Disable caching for real-time data
  res.set({
    'Cache-Control': 'no-store, no-cache, must-revalidate, private',
    'Pragma': 'no-cache',
    'Expires': '0'
  });

  try {
    if (!fs.existsSync(DATA_FILE)) {
      return res.status(404).json({
        error: 'Data file not found. Please refresh data first.',
        refreshStatus
      });
    }
    const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    await ensureNewsForStocks(data);
    res.json({
      data,
      metadata: {
        count: data.length,
        lastUpdated: refreshStatus.lastUpdated,
        refreshInProgress: refreshStatus.inProgress
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Refresh data by running the Python script in background
app.post('/api/refresh', async (req, res) => {
  // Disable caching
  res.set({
    'Cache-Control': 'no-store, no-cache, must-revalidate, private',
    'Pragma': 'no-cache',
    'Expires': '0'
  });

  console.log('Refresh requested...');

  // If already refreshing, return current data
  if (refreshStatus.inProgress) {
    console.log('Refresh already in progress, returning cached data');
    try {
      const data = fs.existsSync(DATA_FILE)
        ? JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'))
        : [];
      await ensureNewsForStocks(data);

      return res.json({
        success: true,
        message: 'Refresh already in progress',
        refreshInProgress: true,
        lastUpdated: refreshStatus.lastUpdated,
        count: data.length,
        data
      });
    } catch (err) {
      return res.json({
        success: true,
        message: 'Refresh in progress',
        refreshInProgress: true,
        lastUpdated: refreshStatus.lastUpdated,
        data: []
      });
    }
  }

  // Return existing data immediately (if available)
  let existingData = [];
  try {
    if (fs.existsSync(DATA_FILE)) {
      existingData = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
      await ensureNewsForStocks(existingData);
    }
  } catch (err) {
    console.log('No existing data available');
  }

  // Start background refresh
  refreshStatus.inProgress = true;
  refreshStatus.lastError = null;
  refreshStatus.progress = { current: 0, total: 0, percentage: 0 };

  console.log('Starting background refresh...');

  const child = exec('python3 generate_vcp_data.py', { cwd: __dirname });

  // Track progress from stdout
  child.stdout.on('data', (data) => {
    const output = data.toString();
    console.log(output);

    // Parse progress from output like "[5/20]"
    const progressMatch = output.match(/\[(\d+)\/(\d+)\]/);
    if (progressMatch) {
      const current = parseInt(progressMatch[1]);
      const total = parseInt(progressMatch[2]);
      refreshStatus.progress = {
        current,
        total,
        percentage: Math.round((current / total) * 100)
      };
    }

    // Check if we found stocks
    const foundMatch = output.match(/Found (\d+) VCP stocks/);
    if (foundMatch) {
      refreshStatus.progress.total = parseInt(foundMatch[1]);
    }
  });

  child.stderr.on('data', (data) => {
    console.error('Error output:', data.toString());
  });

  child.on('close', (code) => {
    refreshStatus.inProgress = false;

    if (code !== 0) {
      console.error('Process exited with code:', code);
      refreshStatus.lastError = `Process exited with code ${code}`;
      return;
    }

    console.log('Background refresh completed successfully');
    refreshStatus.lastUpdated = new Date().toISOString();
    refreshStatus.lastError = null;
    refreshStatus.progress = { current: 0, total: 0, percentage: 100 };
    saveCacheMetadata();
  });

  // Return immediately with existing data
  res.json({
    success: true,
    message: 'Refresh started in background',
    refreshInProgress: true,
    lastUpdated: refreshStatus.lastUpdated,
    count: existingData.length,
    data: existingData
  });
});

// Get refresh status
app.get('/api/refresh/status', (req, res) => {
  // Critical: Disable all caching for real-time status polling
  res.set({
    'Cache-Control': 'no-store, no-cache, must-revalidate, private',
    'Pragma': 'no-cache',
    'Expires': '0',
    'ETag': false
  });

  let currentData = [];
  try {
    if (fs.existsSync(DATA_FILE)) {
      currentData = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    }
  } catch (err) {
    // Ignore errors
  }

  res.json({
    inProgress: refreshStatus.inProgress,
    lastUpdated: refreshStatus.lastUpdated,
    lastError: refreshStatus.lastError,
    count: currentData.length,
    progress: refreshStatus.progress,
    timestamp: new Date().toISOString() // Add timestamp to ensure unique response
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`\n🚀 VCP Stock API Server running on http://localhost:${PORT}`);
  console.log(`\nEndpoints:`);
  console.log(`  GET  /api/stocks  - Get current VCP stocks`);
  console.log(`  POST /api/refresh - Refresh VCP data`);
  console.log(`  GET  /api/health  - Health check\n`);
});
