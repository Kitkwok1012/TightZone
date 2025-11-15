const express = require('express');
const cors = require('cors');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 5001;

app.use(cors());
app.use(express.json());

// Path to the data file
const DATA_FILE = path.join(__dirname, 'web/vcp-viewer/public/vcp_stocks.json');

// Get current VCP stocks data
app.get('/api/stocks', (req, res) => {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      return res.status(404).json({ error: 'Data file not found. Please refresh data first.' });
    }
    const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Refresh data by running the Python script
app.post('/api/refresh', (req, res) => {
  console.log('Refreshing VCP data...');

  exec('python3 generate_vcp_data.py', { cwd: __dirname }, (error, stdout, stderr) => {
    if (error) {
      console.error('Error refreshing data:', error);
      return res.status(500).json({ error: error.message, stderr });
    }

    console.log('Data refreshed successfully');
    console.log(stdout);

    try {
      const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
      res.json({
        success: true,
        message: 'Data refreshed successfully',
        count: data.length,
        data
      });
    } catch (err) {
      res.status(500).json({ error: 'Failed to read refreshed data', details: err.message });
    }
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
