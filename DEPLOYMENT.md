# Deployment Guide for Self-Hosted Cattle Keeper API

This guide covers deploying the Node.js + Express + SQLite backend to Railway and Render platforms.

## Prerequisites

- Node.js 18+ installed locally
- Git installed
- A Railway or Render account
- GitHub account (for code hosting)

## Quick Start (Local Development)

### 1. Navigate to the server directory

```bash
cd server
```

### 2. Install dependencies

```bash
npm install
```

### 3. Create environment file

```bash
cp .env.example .env
```

Edit `.env` and set your API key:
```
API_KEY=your-secure-random-string
```

### 4. Start the development server

```bash
npm run dev
```

The API will be available at `http://localhost:3000`

### 5. Test the API

```bash
# Health check
curl http://localhost:3000/health

# Get all cattle
curl http://localhost:3000/api/v1/cattle
```

---

## Deployment to Railway

### Option 1: Deploy from GitHub

1. **Push your code to GitHub**
   ```bash
   git add .
   git commit -m "Add self-hosted API"
   git push origin main
   ```

2. **Create a new project on Railway**
   - Go to [Railway.app](https://railway.app)
   - Sign in with GitHub
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your repository
   - Select the `server` directory as the root

3. **Configure environment variables**
   - In Railway dashboard, go to your service
   - Click "Variables" tab
   - Add the following:
     ```
     NODE_ENV=production
     PORT=3000
     API_KEY=your-secure-random-string
     DATABASE_PATH=./data/database.sqlite
     UPLOAD_DIR=./uploads
     CORS_ORIGIN=*
     ```
   - Generate a secure API key: `openssl rand -base64 32`

4. **Deploy**
   - Railway will automatically build and deploy
   - Watch the deployment logs for any errors
   - Once deployed, click the URL to test

5. **Update frontend environment**
   - After deployment, update your frontend `.env`:
     ```
     VITE_API_URL=https://your-railway-app.railway.app/api/v1
     VITE_API_KEY=your-secure-random-string
     ```

### Option 2: Deploy with Railway CLI

```bash
# Install Railway CLI
npm install -g railway

# Login to Railway
railway login

# Initialize project
railway init

# Set environment variables
railway variables set NODE_ENV=production
railway variables set API_KEY=your-secure-random-string

# Deploy
railway up
```

---

## Deployment to Render

### 1. Push Code to GitHub

Make sure your code is on GitHub with the `server/` directory.

### 2. Create a New Web Service

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click "New +" and select "Web Service"
3. Connect your GitHub repository
4. Configure the build settings:
   - **Root Directory**: `server`
   - **Build Command**: `npm ci && npm run build`
   - **Start Command**: `npm run start`

### 3. Configure Environment Variables

In the Render dashboard, add these environment variables:

| Key | Value |
|-----|-------|
| `NODE_ENV` | `production` |
| `PORT` | `10000` |
| `DATABASE_PATH` | `./data/database.sqlite` |
| `UPLOAD_DIR` | `./uploads` |
| `API_KEY` | (Generate a secure key) |
| `CORS_ORIGIN` | `*` |

To generate a secure API key:
```bash
openssl rand -base64 32
```

### 4. Create a Persistent Disk (Optional for Image Storage)

For persistent image storage across deployments:

1. In Render dashboard, go to your service
2. Click "Disks" tab
3. Click "Create Disk"
4. Configure:
   - Name: `uploads`
   - Mount Path: `/app/uploads`
   - Size: 1GB (or your preferred size)

### 5. Deploy

1. Click "Create Web Service"
2. Wait for the build to complete
3. Check logs for any errors
4. Once deployed, your API will be available at `https://your-service-name.onrender.com`

---

## Verifying Your Deployment

### Health Check

```bash
curl https://your-api-domain.com/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "database": "connected",
  "uptime": 123.45
}
```

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| GET | `/api/v1/cattle` | Get all cattle |
| POST | `/api/v1/cattle` | Add cattle |
| PUT | `/api/v1/cattle/:id` | Update cattle |
| DELETE | `/api/v1/cattle/:id` | Delete cattle |
| GET | `/api/v1/milk` | Get milk records |
| POST | `/api/v1/milk` | Add milk record |
| DELETE | `/api/v1/milk/:id` | Delete milk record |
| GET | `/api/v1/activities` | Get activities |
| POST | `/api/v1/activities` | Add activity |
| POST | `/api/v1/images/upload` | Upload image |

### Testing with Authentication

All API requests require the `X-API-Key` header:

```bash
curl -H "X-API-Key: your-api-key" https://your-api-domain.com/api/v1/cattle
```

---

## Troubleshooting

### Database Issues

If you see "database not initialized" errors:
1. Check that `DATABASE_PATH` is set correctly
2. Ensure the data directory exists and is writable

### Image Upload Fails

1. Check that `UPLOAD_DIR` exists and is writable
2. Verify file size is under 5MB
3. Check allowed file types (jpg, png, gif, webp)

### CORS Errors

If frontend can't connect to API:
1. Verify `CORS_ORIGIN` includes your frontend URL
2. Check that API key is being sent correctly

### Port Issues

- Railway uses port 3000 by default
- Render uses port 10000 by default
- The `PORT` environment variable overrides the default

---

## Frontend Deployment

After deploying the backend, update your frontend:

### Update Environment Variables

```bash
# .env file
VITE_API_URL=https://your-api-domain.com/api/v1
VITE_API_KEY=your-secure-random-string
```

### Deploy Frontend

The frontend can be deployed to:
- **Vercel**: `vercel --prod`
- **Netlify**: Connect your GitHub repo
- **Railway**: Deploy as a separate service

### Frontend Environment Variables

Make sure to set these in your frontend hosting platform:

| Variable | Value |
|----------|-------|
| `VITE_API_URL` | Your backend API URL |
| `VITE_API_KEY` | Same API key as backend |

---

## Security Considerations

1. **API Key**: Use a strong, random API key (32+ characters)
2. **CORS**: In production, restrict `CORS_ORIGIN` to your frontend domain
3. **HTTPS**: Both Railway and Render provide HTTPS automatically
4. **Secrets**: Never commit API keys to version control

Example production CORS setting:
```env
CORS_ORIGIN=https://your-frontend-domain.com
```

---

## Backup and Recovery

### Backup SQLite Database

```bash
# Create a backup
sqlite3 data/database.sqlite ".backup backup.sqlite"

# Or copy the file
cp data/database.sqlite backup_$(date +%Y%m%d).sqlite
```

### Restore from Backup

```bash
sqlite3 data/database.sqlite ".restore backup.sqlite"
```

### Automated Backups (Railway)

Use Railway's database backups or set up a cron job:
```bash
# Add to your deployment
0 0 * * * sqlite3 /app/data/database.sqlite ".backup /app/backups/backup_$(date +\%Y\%m\%d).sqlite"
```

---

## Support

If you encounter issues:

1. Check the deployment logs for error messages
2. Verify all environment variables are set correctly
3. Test locally first with `npm run dev`
4. Review the API documentation at `/api/v1` endpoint
