# 🚀 Quick Start Deployment Guide

**Time to Deploy**: ~15-20 minutes  
**Platforms**: Railway (Backend) + Vercel (Frontend)

---

## Step 1: Get API Keys (5 min)

1. **Google Gemini**: https://aistudio.google.com/app/apikey ✅ **REQUIRED**
2. **Tavily** (optional): https://tavily.com

---

## Step 2: Push to GitHub (3 min)

```bash
cd c:\Users\Dell\Downloads\ikf-skill-deploy

git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

---

## Step 3: Deploy Backend to Railway (5 min)

1. Go to **railway.app** → "Start a New Project"
2. Select "Deploy from GitHub repo" → Choose your repo
3. Go to **Variables** tab, add:
   ```
   GOOGLE_API_KEY=your_key_here
   TAVILY_API_KEY=your_key_here
   SQLITE_DB_PATH=/data/ikf_chat.db
   ```
4. Go to **Settings** → Add Volume:
   - Mount path: `/data`
   - Size: 1GB
5. Get your Railway URL from **Domains** section
6. Test: Visit `https://your-backend.railway.app/health`

---

## Step 4: Deploy Frontend to Vercel (5 min)

1. Go to **vercel.com** → "Add New Project"
2. Import your GitHub repo
3. **Set Root Directory**: `src/frontend-v2`
4. Add **Environment Variable**:
   ```
   NEXT_PUBLIC_API_URL=https://your-backend.railway.app
   ```
   ⚠️ Use your Railway URL, NO trailing slash
5. Click "Deploy"
6. Visit your Vercel URL and test the chat!

---

## Step 5: Fix CORS (if needed)

If you see CORS errors in browser console:

1. Go to Railway → Variables
2. Add:
   ```
   CORS_ORIGINS=["https://your-app.vercel.app"]
   ```
3. Redeploy

---

## ✅ Done!

**Frontend**: `https://your-app.vercel.app`  
**Backend**: `https://your-backend.railway.app`

Need more details? See **DEPLOYMENT_GUIDE.md**

---

## Common Issues

| Problem | Solution |
|---------|----------|
| Build fails on Railway | Check build logs, verify Dockerfile is at root |
| Frontend can't connect | Verify `NEXT_PUBLIC_API_URL` matches Railway URL exactly |
| CORS errors | Add Vercel URL to Railway's `CORS_ORIGINS` variable |
| Skills not loading | Railway Dockerfile should copy entire repo (it does) |
| Database resets | Verify volume mounted at `/data` in Railway |

---

## Environment Variables Cheat Sheet

**Railway (Backend)**:
```bash
GOOGLE_API_KEY=AIza...                    # Required
TAVILY_API_KEY=tvly-...                   # Recommended
SQLITE_DB_PATH=/data/ikf_chat.db         # For persistence
CORS_ORIGINS=["https://app.vercel.app"]  # If CORS errors
```

**Vercel (Frontend)**:
```bash
NEXT_PUBLIC_API_URL=https://backend.railway.app  # Required, no trailing /
```

---

**Need Help?** Check DEPLOYMENT_GUIDE.md for detailed troubleshooting!
