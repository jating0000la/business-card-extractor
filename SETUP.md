# Business Card Data Extractor - Setup Instructions

## Quick Start (Development)

### Prerequisites
- Node.js 18+ and npm
- MongoDB (local or Atlas)
- Google Cloud Project with OAuth2 configured
- OpenAI API key or Google AI Studio API key

### 1. Setup Google OAuth2
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable Google+ API
4. Create OAuth2 credentials (Web application)
5. Add authorized origins: `http://localhost:3000`, `http://localhost:5173`
6. Add authorized redirect URIs: `http://localhost:3000`, `http://localhost:5173`
7. Note down Client ID and Client Secret

### 2. Install Dependencies
```bash
# Install root dependencies
npm install

# Install all dependencies (backend + frontend)
npm run install:all
```

### 3. Configure Environment Variables

**Backend (.env):**
```bash
cd backend
cp .env.example .env
```
Edit `backend/.env` with your values:
- `MONGODB_URI`: Your MongoDB connection string
- `JWT_SECRET`: Random 32+ character string
- `GOOGLE_CLIENT_ID` & `GOOGLE_CLIENT_SECRET`: From Google Console
- `ENCRYPTION_KEY`: Random 32 character string

**Frontend (.env):**
```bash
cd frontend
cp .env.example .env
```
Edit `frontend/.env`:
- `VITE_GOOGLE_CLIENT_ID`: Same as backend Google Client ID

### 4. Start Development Servers
```bash
# Start both backend and frontend
npm run dev

# Or start individually:
npm run dev:backend  # Runs on http://localhost:3001
npm run dev:frontend # Runs on http://localhost:3000
```

### 5. Configure AI Provider
1. Go to http://localhost:3000
2. Sign in with Google
3. Navigate to Settings > AI Configuration
4. Enter your OpenAI API key or Google AI Studio key
5. Test the connection

### 6. Configure Webhooks (Optional)
1. Go to Settings > Webhook Settings
2. Enter your webhook URL and secret
3. Select events to receive
4. Test the webhook

## Production Deployment

### Using Docker Compose

1. **Copy environment file:**
```bash
cp .env.example .env
```

2. **Edit `.env` with production values:**
- Use strong passwords and secrets
- Set production URLs
- Configure your domain

3. **Start services:**
```bash
docker-compose up -d
```

4. **Check status:**
```bash
docker-compose ps
docker-compose logs -f
```

### Manual Deployment

#### Backend (Node.js)
```bash
cd backend
npm ci --production
npm start
```

#### Frontend (Static Build)
```bash
cd frontend
npm ci
npm run build
# Serve dist/ folder with nginx/apache
```

## Environment Variables Reference

### Backend
| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| NODE_ENV | Environment | No | development |
| PORT | Server port | No | 3001 |
| MONGODB_URI | MongoDB connection | Yes | - |
| JWT_SECRET | JWT signing key | Yes | - |
| JWT_EXPIRES_IN | JWT expiration | No | 7d |
| GOOGLE_CLIENT_ID | Google OAuth ID | Yes | - |
| GOOGLE_CLIENT_SECRET | Google OAuth secret | Yes | - |
| ENCRYPTION_KEY | AES encryption key | Yes | - |
| FRONTEND_URL | Frontend URL for CORS | No | http://localhost:3000 |
| REDIS_HOST | Redis host (optional) | No | localhost |
| REDIS_PORT | Redis port (optional) | No | 6379 |

### Frontend
| Variable | Description | Required |
|----------|-------------|----------|
| VITE_API_URL | Backend API URL | No |
| VITE_GOOGLE_CLIENT_ID | Google OAuth Client ID | Yes |

## API Documentation

### Authentication
- **POST /api/auth/google** - Google Sign-in
- **POST /api/auth/verify** - Verify JWT token
- **POST /api/auth/refresh** - Refresh token

### Cards
- **POST /api/cards/process** - Process business card image
- **GET /api/cards** - Get all cards (paginated)
- **GET /api/cards/:id** - Get single card
- **GET /api/cards/stats/overview** - Get statistics

### Admin (Admin only)
- **GET /api/admin** - Get organization users
- **POST /api/admin/invite** - Invite new user
- **PUT /api/admin/:id/role** - Update user role
- **PUT /api/admin/:id/status** - Update user status
- **DELETE /api/admin/:id** - Remove user

### Configuration (Admin only)
- **GET/PUT /api/config/ai** - AI provider settings
- **GET/PUT /api/config/webhook** - Webhook settings
- **POST /api/config/ai/test** - Test AI connection
- **POST /api/config/webhook/test** - Test webhook

## Troubleshooting

### Common Issues

1. **Google Sign-in not working:**
   - Check Google Client ID is correct
   - Verify authorized origins in Google Console
   - Ensure Google+ API is enabled

2. **AI processing fails:**
   - Verify API key is correct
   - Check AI provider settings
   - Ensure sufficient API credits

3. **Database connection fails:**
   - Check MongoDB URI
   - Verify database is running
   - Check network connectivity

4. **Webhook delivery fails:**
   - Verify webhook URL is accessible
   - Check HMAC signature validation
   - Review webhook endpoint logs

### Logs
- Backend logs: `backend/logs/` (in production)
- Browser console for frontend issues
- Docker logs: `docker-compose logs -f [service]`

## Support

For issues and feature requests, please check the documentation or create an issue in the repository.