@echo off
echo 🚀 Starting Business Card Data Extractor...
echo.
echo 🔧 Killing any existing Node.js processes...
taskkill /f /im node.exe >nul 2>&1

echo 📦 Installing dependencies if needed...
if not exist "node_modules" (
    echo Installing root dependencies...
    npm install
)

if not exist "backend\node_modules" (
    echo Installing backend dependencies...
    cd backend && npm install && cd ..
)

if not exist "frontend\node_modules" (
    echo Installing frontend dependencies...
    cd frontend && npm install && cd ..
)

echo.
echo 🌟 Starting both Frontend and Backend servers...
echo.
echo 📍 Frontend will be available at: http://localhost:3000
echo 📍 Backend API will be available at: http://localhost:3001
echo 📍 Health Check: http://localhost:3001/health
echo 📍 Metrics: http://localhost:3001/metrics
echo.
echo Press Ctrl+C to stop both servers
echo.

npm run dev