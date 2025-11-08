#!/bin/bash

echo "🚀 Starting Business Card Data Extractor..."
echo ""

echo "🔧 Killing any existing Node.js processes..."
pkill -f node || true

echo "📦 Installing dependencies if needed..."
if [ ! -d "node_modules" ]; then
    echo "Installing root dependencies..."
    npm install
fi

if [ ! -d "backend/node_modules" ]; then
    echo "Installing backend dependencies..."
    cd backend && npm install && cd ..
fi

if [ ! -d "frontend/node_modules" ]; then
    echo "Installing frontend dependencies..."
    cd frontend && npm install && cd ..
fi

echo ""
echo "🌟 Starting both Frontend and Backend servers..."
echo ""
echo "📍 Frontend will be available at: http://localhost:3000"
echo "📍 Backend API will be available at: http://localhost:3001"  
echo "📍 Health Check: http://localhost:3001/health"
echo "📍 Metrics: http://localhost:3001/metrics"
echo ""
echo "Press Ctrl+C to stop both servers"
echo ""

npm run dev