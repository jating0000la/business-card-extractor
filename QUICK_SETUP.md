# Quick Setup Guide - MongoDB + Firebase

## Your Current Setup
✅ MongoDB is already running on your PC  
✅ Firebase credentials are configured in frontend/.env.example  

## Next Steps

### 1. Configure Backend Environment
Copy the backend environment file and update it:
```bash
cd backend
copy .env.example .env
```

Edit `backend\.env` with these values:
```bash
# Database (since MongoDB is already running locally)
MONGODB_URI=mongodb://localhost:27017/card-extractor

# JWT Secret (generate a random string)
JWT_SECRET=your-super-secret-jwt-key-change-this-to-something-random-and-long

# Google OAuth (same as your Firebase credentials)
GOOGLE_CLIENT_ID=975860144476-your-actual-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret-from-firebase

# Encryption Key (32 characters - generate random)
ENCRYPTION_KEY=abcdef1234567890abcdef1234567890

# Frontend URL
FRONTEND_URL=http://localhost:3000
```

### 2. Configure Frontend Environment  
Copy your existing frontend .env file:
```bash
cd frontend
copy .env.example .env
```

Your current frontend .env.example looks good! Just copy it to .env:
```bash
VITE_API_URL=http://localhost:3001/api
VITE_GOOGLE_CLIENT_ID=your-google-client-id-here
VITE_FIREBASE_API_KEY=AIzaSyAxZL1iUTnvm-p6sqRSg5G5uZu9ztA8me0
VITE_FIREBASE_APP_ID=1:975860144476:web:678bc5d5e4c4030e450999 
VITE_FIREBASE_PROJECT_ID=taskflowpro-c62c1
```

### 3. Install Dependencies
```bash
# From the root folder
npm run install:all
```

### 4. Start the Application
```bash
# Start both backend and frontend
npm run dev
```

This will start:
- Backend API on http://localhost:3001
- Frontend app on http://localhost:3000

### 5. First Login
1. Open http://localhost:3000 in your browser
2. Click "Sign in with Google" 
3. The first user to sign in will automatically become the Admin
4. Go to Settings to configure AI providers (OpenAI or Google AI Studio)

## Firebase Console Setup (if needed)
If you need to verify your Firebase setup:

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `taskflowpro-c62c1`
3. Go to Authentication > Sign-in method
4. Ensure Google is enabled
5. Add authorized domains: `localhost`, `localhost:3000`

## Troubleshooting

### MongoDB Connection Issues
```bash
# Check if MongoDB is running
net start MongoDB
# or
mongod --version
```

### Google Sign-in Issues
- Verify your Google Client ID matches in both frontend and backend .env files
- Check Firebase Console authorized domains include `localhost`

### Port Conflicts
If ports 3000 or 3001 are busy:
```bash
# Change ports in package.json scripts or .env files
# Backend: PORT=3002 in backend/.env
# Frontend: Update vite.config.js server.port
```

## Ready to Test!
Once everything is running, you can:
1. Sign in with Google
2. Upload a business card image
3. See the AI extract the data
4. Configure webhooks (optional)
5. Invite other users (admin only)

The system will work with your existing MongoDB and Firebase setup!