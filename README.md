# Business Card Data Extractor

A cloud-based, mobile-friendly Business Card Data Extractor system with multi-organization support.

## Features

- 🏢 Multi-organization support with Admin/User roles
- 🔐 Google Sign-In authentication
- 🤖 AI-powered data extraction (OpenAI/Google AI Studio/Ollama/LM Studio)
- 📱 Mobile-friendly image capture
- 🔒 Secure credential encryption (AES)
- 🪝 Webhook integration with HMAC signatures
- 💾 No image storage - privacy-focused
- ⚡ Real-time processing

## Tech Stack

- **Frontend:** React + Tailwind CSS + Vite
- **Backend:** Node.js + Express + Mongoose
- **Database:** MongoDB
- **Queue:** BullMQ + Redis (optional)
- **AI:** OpenAI API / Google AI Studio / Ollama / LM Studio

## Quick Start

1. **Install dependencies:**
   ```bash
   npm run install:all
   ```

2. **Setup environment variables:**
   - Copy `backend/.env.example` to `backend/.env`
   - Configure MongoDB, Google OAuth, and other settings

3. **Start development servers:**
   ```bash
   npm run dev
   ```

## Project Structure

```
├── backend/               # Node.js API server
│   ├── src/
│   │   ├── models/       # MongoDB schemas
│   │   ├── routes/       # Express routes
│   │   ├── middleware/   # Auth & validation
│   │   ├── services/     # AI & webhook services
│   │   └── utils/        # Helpers & encryption
├── frontend/             # React application
│   ├── src/
│   │   ├── components/   # React components
│   │   ├── pages/        # Page components
│   │   ├── hooks/        # Custom hooks
│   │   └── utils/        # Utilities
└── docs/                 # Documentation
```

## AI Provider Configuration

This application supports multiple AI providers:

### Cloud Providers
- **OpenAI GPT-4 Vision**: High accuracy, pay-per-use
- **Google AI Studio (Gemini)**: Alternative cloud option

### Local Providers
- **Ollama**: Run models locally for complete privacy
- **LM Studio**: User-friendly local model interface

For detailed setup instructions for local AI providers, see [OLLAMA_LM_STUDIO_SETUP.md](./OLLAMA_LM_STUDIO_SETUP.md).

### Choosing an AI Provider

| Provider | Privacy | Cost | Setup | Performance |
|----------|---------|------|-------|-------------|
| OpenAI | Cloud | Pay-per-use | Easy | Excellent |
| Google AI | Cloud | Pay-per-use | Easy | Excellent |
| Ollama | Local | Free | Moderate | Good* |
| LM Studio | Local | Free | Easy | Good* |

*Performance depends on your hardware

## Environment Variables

See `backend/.env.example` for required environment variables.

## Deployment

- **Frontend:** Vercel, Netlify
- **Backend:** Railway, Render, Heroku
- **Database:** MongoDB Atlas
- **Queue:** Redis Cloud (optional)

## License

MIT