# Pre-Deployment Checklist

## Before You Start

### ✅ Accounts Setup
- [ ] GitHub account created
- [ ] Railway account created (sign up at railway.app)
- [ ] Vercel account created (sign up at vercel.com)

### ✅ API Keys Obtained
- [ ] Google Gemini API Key (REQUIRED) - Get from https://aistudio.google.com/app/apikey
- [ ] Tavily API Key (RECOMMENDED) - Get from https://tavily.com
- [ ] OpenAI API Key (OPTIONAL) - If using OpenAI models
- [ ] Groq API Key (OPTIONAL) - If using Groq models

### ✅ Local Preparation
- [ ] Git installed on your machine
- [ ] Code is in a local directory
- [ ] All API keys securely stored (not in code)

---

## Deployment Steps

### Step 1: GitHub Repository Setup
- [ ] Created new GitHub repository
- [ ] Initialized git in local project: `git init`
- [ ] Added all files: `git add .`
- [ ] Created first commit: `git commit -m "Initial commit"`
- [ ] Added remote: `git remote add origin <your-repo-url>`
- [ ] Pushed to GitHub: `git push -u origin main`
- [ ] Verified all files are on GitHub

### Step 2: Backend Deployment (Railway)
- [ ] Created new Railway project
- [ ] Connected to GitHub repository
- [ ] Verified Dockerfile detected
- [ ] Added environment variable: `GOOGLE_API_KEY`
- [ ] Added environment variable: `TAVILY_API_KEY`
- [ ] Added environment variable: `SQLITE_DB_PATH=/data/ikf_chat.db`
- [ ] Added environment variable: `ALLOW_UNAUTHENTICATED_CONVERSATION_DELETE=false`
- [ ] Created and attached volume at `/data` mount path (1GB)
- [ ] Deployment successful (check build logs)
- [ ] Generated public domain URL
- [ ] Copied Railway backend URL
- [ ] Tested health endpoint: `https://your-backend.railway.app/health` returns 200
- [ ] Tested API docs: `https://your-backend.railway.app/docs` loads

### Step 3: Frontend Deployment (Vercel)
- [ ] Clicked "Add New Project" in Vercel
- [ ] Imported GitHub repository
- [ ] Set Root Directory to: `src/frontend-v2`
- [ ] Framework Preset: Next.js (auto-detected)
- [ ] Added environment variable: `NEXT_PUBLIC_API_URL=<railway-url>`
- [ ] Verified Railway URL has NO trailing slash
- [ ] Clicked Deploy
- [ ] Deployment successful (check build logs)
- [ ] Copied Vercel frontend URL
- [ ] Opened frontend URL in browser

### Step 4: Update CORS (if needed)
- [ ] If CORS errors appear, added Vercel domain to Railway's `CORS_ORIGINS`
- [ ] Redeployed Railway backend
- [ ] Cleared browser cache

---

## Post-Deployment Testing

### ✅ Basic Functionality
- [ ] Frontend loads without errors
- [ ] Browser console has no errors (F12 → Console)
- [ ] Can see chat interface
- [ ] Can type and send messages
- [ ] Receive streaming responses

### ✅ Agent/Skills Testing
- [ ] Sent message: "List all available skills"
- [ ] Sent message: "What agents do you have?"
- [ ] Skills and agents loaded correctly

### ✅ Artifact Testing
- [ ] Requested artifact generation (e.g., "Create a simple report")
- [ ] Artifact generated successfully
- [ ] Can download artifact
- [ ] Artifact opens correctly

### ✅ Persistence Testing
- [ ] Created a conversation
- [ ] Refreshed page
- [ ] Conversation still appears in sidebar
- [ ] Previous messages visible

---

## Troubleshooting Completed

### If Build Failed
- [ ] Checked Railway build logs for errors
- [ ] Checked Vercel build logs for errors
- [ ] Verified all files pushed to GitHub
- [ ] Verified configuration settings

### If API Calls Fail
- [ ] Verified `NEXT_PUBLIC_API_URL` in Vercel matches Railway URL
- [ ] Verified Railway backend is running (check dashboard)
- [ ] Verified no trailing slash in `NEXT_PUBLIC_API_URL`
- [ ] Checked CORS_ORIGINS includes Vercel domain
- [ ] Checked browser Network tab for error details

### If Database Issues
- [ ] Verified Railway volume is attached
- [ ] Verified `SQLITE_DB_PATH=/data/ikf_chat.db` in Railway
- [ ] Checked Railway logs for SQLite errors

---

## Final Verification

- [ ] Frontend URL bookmarked
- [ ] Backend URL bookmarked
- [ ] API docs URL bookmarked: `<backend-url>/docs`
- [ ] Railway dashboard URL bookmarked
- [ ] Vercel dashboard URL bookmarked
- [ ] GitHub repository URL bookmarked
- [ ] All API keys stored securely
- [ ] `.env` files NOT committed to GitHub
- [ ] Deployment documentation reviewed
- [ ] Team members notified of new URLs

---

## Important URLs

| Service | URL | Notes |
|---------|-----|-------|
| **Frontend** | https://_____________.vercel.app | Main user interface |
| **Backend API** | https://_____________.up.railway.app | Backend API |
| **API Docs** | https://_____________.up.railway.app/docs | Interactive API docs |
| **Health Check** | https://_____________.up.railway.app/health | Backend health status |
| **GitHub Repo** | https://github.com/_____________/_____________ | Source code |
| **Railway Dashboard** | https://railway.app/project/_____________ | Backend management |
| **Vercel Dashboard** | https://vercel.com/_____________/_____________ | Frontend management |

Fill in the blanks above with your actual URLs!

---

## Next Steps (After Successful Deployment)

### Immediate
- [ ] Share frontend URL with team/users
- [ ] Monitor Railway and Vercel dashboards for first 24 hours
- [ ] Set up usage alerts (if available)

### Within 1 Week
- [ ] Add custom domain (if needed)
- [ ] Set up error monitoring (Sentry, etc.)
- [ ] Implement analytics tracking
- [ ] Add authentication (before going fully public)

### Within 1 Month
- [ ] Implement rate limiting
- [ ] Set up automated backups
- [ ] Create CI/CD pipeline with tests
- [ ] Document API for external users
- [ ] Plan scaling strategy

---

## Emergency Contacts

- Railway Status: https://status.railway.app
- Vercel Status: https://www.vercel-status.com
- Railway Support: https://help.railway.app
- Vercel Support: https://vercel.com/support

---

**Deployment Date**: _______________
**Deployed By**: _______________
**Version**: _______________

✨ Congratulations on your deployment! ✨
