# Deployment Instructions for Backend

## Step 1: Deploy to Railway

1. Go to https://railway.app and sign in
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Choose your repository: `scholes572/Cattle-Info`
5. Set Root Directory to: `server`
6. Click "Deploy Now"

## Step 2: Add Environment Variables

In Railway dashboard, go to your service → Variables tab:
Add these variables:

| Key | Value |
|-----|-------|
| NODE_ENV | production |
| PORT | 3000 |
| API_KEY | (generate with: `openssl rand -base64 32`) |
| DATABASE_PATH | ./data/database.sqlite |
| UPLOAD_DIR | ./uploads |
| CORS_ORIGIN | * |

## Step 3: Get Your Backend URL

After deployment, Railway will give you a URL like:
`https://cattle-info-api.railway.app`

## Step 4: Update Frontend .env

Update the `.env` file in your project root:

```
VITE_API_URL=https://your-railway-app.railway.app/api/v1
VITE_API_KEY=your-generated-api-key
```

## Step 5: Redeploy Frontend

Push changes to GitHub and Vercel will auto-deploy.

## Testing

- Backend health: `https://your-url/health`
- Frontend: Your Vercel URL
