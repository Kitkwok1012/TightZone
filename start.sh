#!/bin/bash

# VCP Stock Viewer Startup Script
# This script kills any existing processes and starts both backend and frontend servers

echo "🧹 Cleaning up existing processes..."

# Kill processes on port 5001 (Backend API)
if lsof -ti:5001 > /dev/null 2>&1; then
    echo "  Killing process on port 5001..."
    lsof -ti:5001 | xargs kill -9 2>/dev/null || true
fi

# Kill processes on port 3000 (React Frontend)
if lsof -ti:3000 > /dev/null 2>&1; then
    echo "  Killing process on port 3000..."
    lsof -ti:3000 | xargs kill -9 2>/dev/null || true
fi

echo ""
echo "🚀 Starting VCP Stock Viewer..."
echo ""

# Start backend server in background
echo "📡 Starting Backend API Server (port 5001)..."
node server.js > backend.log 2>&1 &
BACKEND_PID=$!
echo "  Backend PID: $BACKEND_PID"

# Wait a moment for backend to start
sleep 2

# Check if backend is still running
if ! ps -p $BACKEND_PID > /dev/null; then
    echo "❌ Backend failed to start. Check backend.log for errors."
    exit 1
fi

echo ""
echo "⚛️  Starting React Frontend (port 3000)..."
echo "  (This will open in your browser automatically)"
echo ""

# Start frontend (this will run in foreground and open browser)
cd web/vcp-viewer && npm start

# If user stops the frontend (Ctrl+C), also kill the backend
echo ""
echo "🛑 Shutting down servers..."
kill $BACKEND_PID 2>/dev/null || true
echo "✅ All processes stopped"
