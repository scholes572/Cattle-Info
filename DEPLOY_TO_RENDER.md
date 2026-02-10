# Deploy Backend to Render.com

## Step 1: Create Render Account

1. Go to https://render.com and sign up
2. Connect your GitHub account

## Step 2: Create Web Service

1. Click **"New +"** → **"Web Service"**
2. Connect your GitHub repository: `scholes572/Cattle-Info`
3. Configure:
   - **Name**: `cattle-keeper-api`
   - **Root Directory**: `server`
   - **Build Command**: `npm ci && npm run build`
   - **Start Command**: `npm run start`

## Step 3: Add Environment Variables

In the Render dashboard, add these under "Environment Variables":

| Key | Value |
|-----|-------|
| NODE_ENV | production |
| PORT | 10000 |
| API_KEY | (generate with: `openssl rand -base64 32`) |
| DATABASE_PATH | ./data/database.sqlite |
| UPLOAD_DIR | ./uploads |
| CORS_ORIGIN | * |

## Step 4: Create Persistent Disk (for uploads)

1. In Render dashboard, go to your service
2. Click **"Disks"** → **"Create Disk"**
3. Configure:
   - Name: `uploads`
   - Mount Path: `/app/uploads`
   - Size: 1GB

## Step 5: Deploy

Click **"Create Web Service"** and wait for deployment.

## Step 6: Get Your Backend URL

After deployment, you'll get a URL like:
`https://cattle-keeper-api.onrender.com`

## Step 7: Update Frontend .env

Update your `.env` file:
```
VITE_API_URL=https://your-render-app.onrender.com/api/v1
VITE_API_KEY=your-generated-api-key
```

Then push to GitHub and Vercel will auto-deploy.
