# How to Run Frontend and Backend Together

## 🚀 Quick Start Methods

### **Method 1: Single Command (Recommended)**
```bash
# Navigate to project root
cd "C:\Users\jkgku\OneDrive\Desktop\webpage\Visiting Card Data Extractor"

# Run both servers concurrently
npm run dev
```

### **Method 2: Use Startup Scripts**

#### **Windows (Command Prompt)**
```cmd
# Double-click or run:
start.bat
```

#### **Windows (PowerShell)**
```powershell
# Run in PowerShell:
.\start.ps1
```

#### **Linux/Mac (Bash)**
```bash
# Make executable and run:
chmod +x start.sh
./start.sh
```

## 📍 Server Information

Once running, access your application at:

- **🌐 Frontend Application**: http://localhost:3000
- **🔧 Backend API**: http://localhost:3001  
- **📊 Health Check**: http://localhost:3001/health
- **📈 Performance Metrics**: http://localhost:3001/metrics

## 🔧 Manual Setup (If needed)

### **Step 1: Install Dependencies**
```bash
# Install root dependencies
npm install

# Install backend dependencies  
cd backend && npm install && cd ..

# Install frontend dependencies
cd frontend && npm install && cd ..
```

### **Step 2: Run Servers**
```bash
# From project root - runs both simultaneously
npm run dev

# OR run separately in different terminals:
npm run dev:backend  # Backend only
npm run dev:frontend # Frontend only
```

## 🛑 Stopping the Servers

- **Press `Ctrl+C`** in the terminal to stop both servers
- Or kill Node.js processes: `Get-Process -Name "node" | Stop-Process -Force`

## 📊 Available Scripts

```json
{
  "dev": "Run both frontend and backend concurrently",
  "dev:backend": "Run backend server only (port 3001)", 
  "dev:frontend": "Run frontend server only (port 3000)",
  "build": "Build frontend for production",
  "start": "Start backend in production mode",
  "install:all": "Install all dependencies (root, backend, frontend)"
}
```

## 🔍 Troubleshooting

### **Port Already in Use Error**
```bash
# Kill existing Node.js processes
Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force

# Wait a few seconds, then restart
npm run dev
```

### **Dependencies Missing**
```bash
# Install all dependencies
npm run install:all
```

### **MongoDB Connection Issues**
- Ensure MongoDB is running on localhost:27017
- Check database name in backend/.env (should be 'processsutra')

## ⚡ Performance Features

The optimized system includes:
- **🗜️ Gzip Compression**: Faster data transfer
- **💾 Multi-level Caching**: Improved response times  
- **📊 Real-time Monitoring**: Performance tracking
- **🔒 Security Headers**: Enterprise-grade security
- **⚡ Lazy Loading**: Efficient frontend loading

## 🎯 Production Deployment

For production deployment:
```bash
# Build frontend
npm run build

# Start backend in production mode
npm start
```

## 💡 Tips

1. **Always run from project root directory**
2. **Use the single `npm run dev` command for simplest setup**
3. **Check http://localhost:3001/health for system status**
4. **Monitor performance at http://localhost:3001/metrics**
5. **Both servers will auto-restart when code changes**

---

**That's it! Your optimized Business Card Data Extractor is ready to use! 🎉**