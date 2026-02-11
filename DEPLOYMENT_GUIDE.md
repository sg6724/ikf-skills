# Complete Deployment Guide: Backend (Railway) + Frontend (Vercel)

This guide walks you through deploying your IKF AI Skills application from scratch: Backend to Railway and Frontend to Vercel.

---

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Repository Preparation](#repository-preparation)
3. [Backend Deployment to Railway](#backend-deployment-to-railway)
4. [Frontend Deployment to Vercel](#frontend-deployment-to-vercel)
5. [Testing & Verification](#testing--verification)
6. [Troubleshooting](#troubleshooting)
7. [Post-Deployment Tips](#post-deployment-tips)

---

## 1. Prerequisites

### Accounts Needed
- ✅ **GitHub Account** (free)
- ✅ **Railway Account** (sign up at [railway.app](https://railway.app) - free tier available)
- ✅ **Vercel Account** (sign up at [vercel.com](https://vercel.com) - free tier available)

### API Keys Required
Before deploying, obtain these API keys:

1. **Google Gemini API Key** (Required)
   - Visit: https://aistudio.google.com/app/apikey
   - Create a new API key
   - Keep it secure

2. **Tavily API Key** (Optional but recommended for web search features)
   - Visit: https://tavily.com
   - Sign up and get your API key

3. **Other Optional Keys** (if you plan to use these services):
   - OpenAI API Key
   - Groq API Key

### Local Tools (for testing before deployment)
- Git installed on your machine
- GitHub Desktop (optional, makes Git easier)

---

## 2. Repository Preparation

### Step 2.1: Create GitHub Repository

1. **Go to GitHub** and sign in
2. Click the **"+"** button (top-right) → **"New repository"**
3. Configure:
   - **Repository name**: `ikf-skill-deploy` (or your preferred name)
   - **Visibility**: Choose Public or Private (both work)
   - **DO NOT initialize** with README, .gitignore, or license (your repo already has these)
4. Click **"Create repository"**

### Step 2.2: Push Your Code to GitHub

Open your terminal/command prompt in the project root (`c:\Users\Dell\Downloads\ikf-skill-deploy`):

```bash
# Initialize git if not already done
git init

# Add all files
git add .

# Create first commit
git commit -m "Initial commit - ready for deployment"

# Add your GitHub repository as remote (replace YOUR_USERNAME and YOUR_REPO)
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git

# Push to GitHub
git branch -M main
git push -u origin main
```

**✅ Checkpoint**: Visit your GitHub repository URL - you should see all your files there.

---

## 3. Backend Deployment to Railway

Railway will use your Dockerfile to build and run the backend.

### Step 3.1: Create Railway Project

1. Go to [railway.app](https://railway.app)
2. Click **"Start a New Project"**
3. Select **"Deploy from GitHub repo"**
4. Authenticate with GitHub (if first time)
5. Select your repository: `YOUR_USERNAME/YOUR_REPO`

### Step 3.2: Configure Build Settings

Railway should automatically detect your Dockerfile. Verify:

1. In Railway project dashboard, click on your service
2. Go to **"Settings"** tab
3. Check **"Build"** section:
   - **Builder**: Should show "Dockerfile"
   - **Dockerfile Path**: Should be `/Dockerfile` (root)
   - **Build Context**: `/` (root directory)

If not auto-detected, manually set these values.

### Step 3.3: Add Environment Variables

1. In Railway service, click **"Variables"** tab
2. Click **"+ New Variable"** and add each of these:

**Required Variables:**
```
GOOGLE_API_KEY=your_google_gemini_api_key_here
```

**Recommended Variables:**
```
TAVILY_API_KEY=your_tavily_api_key_here
ALLOW_UNAUTHENTICATED_CONVERSATION_DELETE=false
DEBUG=false
PORT=8000
```

**Optional CORS Configuration** (if you need specific domains):
```
CORS_ORIGINS=["https://your-vercel-app.vercel.app","http://localhost:3000"]
```

### Step 3.4: Add Persistent Storage (Recommended)

Your app uses SQLite. To persist data across deployments:

1. In Railway dashboard, click **"+ New"** → **"Volume"**
2. Configure:
   - **Name**: `ikf-data`
   - **Mount Path**: `/data`
   - **Size**: 1 GB (sufficient for SQLite)
3. Link volume to your service
4. Add environment variable:
   ```
   SQLITE_DB_PATH=/data/ikf_chat.db
   ```

### Step 3.5: Deploy

1. Click **"Deploy"** button
2. Watch the build logs (should take 2-5 minutes)
3. Once deployed, Railway will show you a URL

### Step 3.6: Get Your Backend URL

1. In Railway service dashboard, look for **"Domains"** section
2. You'll see a URL like: `https://your-app-name.up.railway.app`
3. Click **"Generate Domain"** if not already generated
4. **COPY THIS URL** - you'll need it for frontend deployment

### Step 3.7: Test Backend

Visit: `https://your-app-name.up.railway.app/health`

Expected response:
```json
{"status": "healthy"}
```

Also check API docs: `https://your-app-name.up.railway.app/docs`

**✅ Checkpoint**: Backend is deployed and accessible!

---

## 4. Frontend Deployment to Vercel

### Step 4.1: Connect Vercel to GitHub

1. Go to [vercel.com](https://vercel.com)
2. Click **"Add New..."** → **"Project"**
3. Click **"Import Git Repository"**
4. Authenticate with GitHub (if first time)
5. Find and select your repository: `YOUR_USERNAME/YOUR_REPO`

### Step 4.2: Configure Project Settings

**IMPORTANT**: The frontend is in a subdirectory!

1. **Framework Preset**: Next.js (should auto-detect)
2. **Root Directory**: Click **"Edit"** and set to `src/frontend-v2`
3. **Build Command**: Leave default (`npm run build`)
4. **Output Directory**: Leave default (`.next`)
5. **Install Command**: Leave default (`npm install`)

### Step 4.3: Add Environment Variable

Click **"Environment Variables"** and add:

```
NEXT_PUBLIC_API_URL=https://your-railway-backend.up.railway.app
```

**⚠️ CRITICAL**: 
- Replace with your actual Railway backend URL (from Step 3.6)
- DO NOT include trailing slash
- This must be the full Railway public URL

Example:
```
NEXT_PUBLIC_API_URL=https://ikf-backend-production.up.railway.app
```

### Step 4.4: Deploy

1. Click **"Deploy"**
2. Vercel will build and deploy (takes 1-3 minutes)
3. You'll get a URL like: `https://your-app.vercel.app`

### Step 4.5: Configure Custom Domain (Optional)

1. In Vercel project → **"Settings"** → **"Domains"**
2. Add your custom domain
3. Follow DNS configuration instructions

**✅ Checkpoint**: Frontend is deployed!

---

## 5. Testing & Verification

### Step 5.1: Basic Functionality Test

1. Visit your Vercel URL: `https://your-app.vercel.app`
2. You should see the chat interface
3. Try sending a message: "Hello, introduce yourself"
4. Verify you get a streaming response

### Step 5.2: Test Agent/Skill Loading

Try these test messages:

```
List all available skills
```

```
What agents do you have?
```

This tests if:
- Backend can read the `skills/` and `agents/` folders
- Filesystem-based content loading works

### Step 5.3: Test Artifact Generation

Try:
```
Create a simple markdown report about AI trends
```

Then check if:
- You can download the generated artifact
- Artifacts are properly stored

### Step 5.4: Check Browser Console

1. Open browser DevTools (F12)
2. Check **Console** tab for errors
3. Check **Network** tab - API calls should be successful (200 status)

### Common Issues to Check:

| Issue | Solution |
|-------|----------|
| CORS errors in browser console | Update `CORS_ORIGINS` in Railway to include your Vercel domain |
| "Failed to fetch" errors | Check `NEXT_PUBLIC_API_URL` in Vercel matches Railway domain exactly |
| Skills/Agents not loading | Verify Dockerfile copies entire repo (it should) |
| Artifacts failing | Check volume mounted at `/data` in Railway |

---

## 6. Troubleshooting

### Backend Issues (Railway)

#### Build Fails
```bash
# Check Railway build logs for:
- Python version mismatch → Dockerfile uses Python 3.12
- Missing dependencies → Check pyproject.toml
- uv installation fails → Railway might need retry
```

**Solution**: 
1. Check Railway build logs
2. Verify Dockerfile is at repo root
3. Try manual redeploy

#### Backend 500 Errors
Check Railway logs:
1. Click your service → **"Deployments"** → Latest deployment
2. Click **"View Logs"**
3. Look for Python errors

**Common causes**:
- Missing API keys (check Variables tab)
- Database path issues (verify SQLITE_DB_PATH and volume)
- Missing skills/agents folders (check Dockerfile COPY command)

#### Skills/Agents Not Found
The Dockerfile copies the entire repo, so skills should be available.

**Verify**:
1. Railway logs should show: "📚 Loaded X skills"
2. Check Dockerfile line: `COPY . /app` exists
3. Test endpoint: `https://your-backend.up.railway.app/docs` → Try `/api/chat`

### Frontend Issues (Vercel)

#### Build Fails
- Check Vercel build logs
- Verify Root Directory is `src/frontend-v2`
- Check `package.json` for all dependencies

#### Frontend Can't Connect to Backend
**Symptoms**: API calls fail, CORS errors, connection refused

**Checklist**:
1. ✅ `NEXT_PUBLIC_API_URL` set in Vercel?
2. ✅ No trailing slash in URL?
3. ✅ Railway backend is running? (check Railway dashboard)
4. ✅ Railway backend health endpoint works?
5. ✅ CORS origins include your Vercel domain?

**Fix CORS**:
Add to Railway environment variables:
```
CORS_ORIGINS=["https://your-app.vercel.app","http://localhost:3000"]
```

#### Environment Variable Not Working
- Vercel requires **rebuild** after environment variable changes
- In Vercel dashboard: **"Deployments"** → Click ⋯ on latest → **"Redeploy"**
- Make sure variable name is exactly: `NEXT_PUBLIC_API_URL`

### Database/Persistence Issues

#### Conversations Not Saving
- Verify Railway volume is mounted
- Check `SQLITE_DB_PATH=/data/ikf_chat.db`
- Check Railway logs for SQLite errors

#### Database Resets on Deploy
- This means volume is not properly attached
- Re-check Step 3.4: Add Persistent Storage

---

## 7. Post-Deployment Tips

### Monitoring

**Railway**:
- Dashboard shows CPU, Memory, Network usage
- Set up usage alerts in Account Settings
- Check logs regularly for errors

**Vercel**:
- Analytics tab shows traffic/performance
- Deployment history shows all builds
- Error tracking available in Integrations

### Updating Your App

**When you make code changes**:

```bash
# Commit changes
git add .
git commit -m "Your update message"
git push

# Railway and Vercel will auto-deploy!
```

Both platforms have automatic deployment from GitHub main branch.

### Cost Management

**Railway Free Tier** (as of 2024):
- $5 credit per month
- Pay only for usage beyond credit
- Usage resets monthly

**Vercel Free Tier**:
- Unlimited deployments
- 100 GB bandwidth/month
- Typically sufficient for small projects

### Security Best Practices

1. **Never commit `.env` files** - they're in `.gitignore`
2. **Rotate API keys** if exposed
3. **Keep production env vars in Railway/Vercel only**
4. **Enable authentication** before public launch (currently no auth)
5. **Set `ALLOW_UNAUTHENTICATED_CONVERSATION_DELETE=false`** in production

### Backup Strategy

**Database**:
- Railway volumes are backed up automatically
- For extra safety, periodically download `/data/ikf_chat.db`

**Code**:
- GitHub is your source of truth
- Tag important releases: `git tag v1.0.0 && git push --tags`

---

## 📊 Quick Reference

### Environment Variables Summary

| Variable | Platform | Required | Example |
|----------|----------|----------|---------|
| `GOOGLE_API_KEY` | Railway | Yes | `AIza...` |
| `TAVILY_API_KEY` | Railway | Recommended | `tvly-...` |
| `SQLITE_DB_PATH` | Railway | Recommended | `/data/ikf_chat.db` |
| `PORT` | Railway | Auto-set | `8000` |
| `CORS_ORIGINS` | Railway | Optional | `["https://app.vercel.app"]` |
| `NEXT_PUBLIC_API_URL` | Vercel | Yes | `https://backend.railway.app` |

### Important URLs

After deployment, bookmark these:

- **Frontend**: `https://your-app.vercel.app`
- **Backend API**: `https://your-backend.railway.app`
- **API Docs**: `https://your-backend.railway.app/docs`
- **Health Check**: `https://your-backend.railway.app/health`
- **Railway Dashboard**: `https://railway.app/dashboard`
- **Vercel Dashboard**: `https://vercel.com/dashboard`
- **GitHub Repo**: `https://github.com/YOUR_USERNAME/YOUR_REPO`

---

## 🎉 Success Checklist

- [ ] GitHub repository created and code pushed
- [ ] Railway backend deployed successfully
- [ ] Railway backend health check returns 200
- [ ] Railway API docs accessible
- [ ] Railway persistent volume attached
- [ ] All environment variables set in Railway
- [ ] Vercel frontend deployed successfully
- [ ] Vercel `NEXT_PUBLIC_API_URL` points to Railway
- [ ] Frontend loads in browser
- [ ] Chat functionality works
- [ ] Skills and agents load correctly
- [ ] Artifacts can be generated and downloaded
- [ ] No CORS errors in browser console
- [ ] Conversations persist after page refresh

---

## 🆘 Getting Help

If you encounter issues:

1. **Check Railway Logs**: Most backend issues show here
2. **Check Vercel Build Logs**: Frontend build problems appear here
3. **Check Browser Console**: Frontend runtime errors visible here
4. **Test Backend Directly**: Use Railway URL + `/docs` to test API independently
5. **Verify Environment Variables**: Double-check all values in both platforms

**Common Quick Fixes**:
- Redeploy: Fixes ~40% of random issues
- Clear browser cache: Fixes frontend caching issues
- Check API key validity: Expired keys cause cryptic errors
- Verify URLs have no trailing slashes

---

## Next Steps

After successful deployment:

1. **Add Authentication**: Implement user authentication before going fully public
2. **Custom Domain**: Set up a custom domain on Vercel
3. **Monitoring**: Set up error tracking (Sentry, etc.)
4. **CI/CD**: Add automated tests in GitHub Actions
5. **Documentation**: Document your specific skills/agents for users
6. **Rate Limiting**: Add rate limiting for production use
7. **Analytics**: Track usage patterns

Good luck with your deployment! 🚀
