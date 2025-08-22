# Deployment Setup

## Railway Deployment

### 1. Create Railway Account & Project
1. Go to [Railway.app](https://railway.app) and sign up
2. Create a new project
3. Connect your GitHub repository

### 2. Environment Setup
In Railway project settings, add these environment variables:

**Required:**
- `NODE_ENV=production`
- `JWT_SECRET=your-secure-jwt-secret-here` (generate with `openssl rand -base64 32`)
- `DATABASE_URL` (automatically provided by Railway PostgreSQL)

**Optional:**
- `CORS_ORIGINS=https://your-domain.railway.app` (Railway will provide this)

### 3. Add PostgreSQL Database
1. In Railway dashboard, click "New Service" → "Database" → "PostgreSQL" 
2. Railway automatically sets `DATABASE_URL` environment variable

### 4. GitHub Actions Setup (Optional)
If you want automatic deployment on push:

1. Get Railway CLI token:
   ```bash
   railway login
   railway whoami --token
   ```

2. Add GitHub Secrets:
   - `RAILWAY_TOKEN`: Your Railway CLI token
   - `RAILWAY_SERVICE`: Your Railway service ID

### 5. Manual Deployment
```bash
npm install -g @railway/cli
railway login
railway link  # Link to your project
railway up    # Deploy
```

## Local Development vs Production

- **Development**: Uses SQLite database (file-based)
- **Production**: Uses PostgreSQL (Railway hosted)

The database adapter automatically switches based on `NODE_ENV` and `DATABASE_URL` presence.

## Build Process

1. Install all dependencies (`npm run install:all`)
2. Build React frontend (`cd client && npm run build`)
3. Copy build to server public folder
4. Start server which serves both API and frontend

## Environment Variables Reference

```bash
# Production (Railway)
NODE_ENV=production
DATABASE_URL=postgresql://...  # Auto-provided by Railway
JWT_SECRET=your-secret-here
CORS_ORIGINS=https://your-app.railway.app

# Development (Local)
NODE_ENV=development
JWT_SECRET=dev-secret-key
# No DATABASE_URL needed - uses SQLite
```

## Testing Deployment

After deployment, visit:
- `https://your-app.railway.app/health` - Health check
- `https://your-app.railway.app` - Your app

The first deployment may take 2-3 minutes as Railway builds everything.