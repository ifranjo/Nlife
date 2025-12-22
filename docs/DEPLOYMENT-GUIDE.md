# Deployment Guide: Fixing Vercel Integration

## Problem: GitHub Actions Deployment Failing

Your CI/CD pipeline shows this error:
```
Error: Error: Input required and not supplied: vercel-token
```

## Solution: Configure Vercel Secrets in GitHub

### Step-by-Step Fix

#### 1. Get Vercel Token

**Option A: Via Vercel CLI**
```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login
# Enter your email, verify via link sent to email

# Create token for GitHub Actions
vercel tokens create "GitHub Actions Deployment"
# Copy the token that appears
```

**Option B: Via Vercel Dashboard**
1. Go to https://vercel.com/account/tokens
2. Click "Create Token"
3. Name it: "GitHub Actions"
4. Scope: Your Account
5. Expiration: Never
6. Click "Create Token"
7. **Copy the token IMMEDIATELY** (it won't be shown again)

#### 2. Get Vercel Organization ID

1. Go to https://vercel.com/<your-org>/settings
2. Look at the URL: `https://vercel.com/your-org-text-here/settings`
3. Copy the `your-org-text-here` part
4. That's your **VERCEL_ORG_ID**

#### 3. Get Vercel Project ID

**Method A: Via Vercel Dashboard**
1. Go to your project: https://vercel.com/<your-org>/<project-name>
2. Click Settings tab
3. Copy the Project ID string

**Method B: Via Vercel CLI**
```bash
vercel project ls
# Look for your project, copy the Project ID
```

#### 4. Add Secrets to GitHub

1. Go to: https://github.com/ifranjo/Nlife/settings/secrets/actions

2. Click "New repository secret"

3. Add these three secrets (one at a time):

   **Secret Name**: `VERCEL_TOKEN`
   - **Value**: [Your token from Step 1]
   - Click "Add secret"

   **Secret Name**: `VERCEL_ORG_ID`
   - **Value**: [Your org ID from Step 2]
   - Click "Add secret"

   **Secret Name**: `VERCEL_PROJECT_ID`
   - **Value**: [Your project ID from Step 3]
   - Click "Add secret"

4. Verify they were added:
   - You should see all three listed under "Repository secrets"

### Step 5: Test the Deployment

Trigger a new deployment in three ways:

**Option A: Push a test commit**
```bash
echo "Testing deployment" >> test-deploy.txt
git add test-deploy.txt
git commit -m "chore: test deployment fix"
git push origin master
rm test-deploy.txt
git add test-deploy.txt
git commit -m "chore: remove test file"
git push origin master
```

**Option B: Re-run last workflow**
1. Go to https://github.com/ifranjo/Nlife/actions
2. Find the last failed workflow run
3. Click "Re-run jobs" button
4. Select "Re-run all jobs"

**Option C: Manual Vercel deploy** (bypasses GitHub Actions)
```bash
# Install Vercel CLI if you haven't
npm i -g vercel

# Deploy from project root
vercel --prod
```

### Verification

**Success indicators:**
- GitHub Actions workflow shows green checkmark
- "Deploy" step shows "Successfully deployed to Vercel"
- Your site loads at: https://www.newlifesolutions.dev
- Vercel dashboard shows latest deployment

### Troubleshooting

**If deployment still fails:**

1. **Check token scope**: Ensure token has access to your organization
2. **Verify project exists**: Run `vercel project ls` to confirm
3. **Token expired?**: Create a new token if needed
4. **Check logs**: View full logs in GitHub Actions

**Alternative: Use Vercel's GitHub Integration**

If GitHub Actions continue to fail, use Vercel's native integration:

1. Go to https://vercel.com/<your-org>/<project-name>/settings/git
2. Connect your GitHub repository
3. Vercel will auto-deploy on every push
4. Disable the deploy step in your workflow (comment it out)

### Security Notes

⚠️ **IMPORTANT**: These secrets are sensitive!
- Never commit them to git
- Never share them publicly
- Use repository secrets, not environment variables in code
- Review token permissions regularly
- Rotate tokens annually

### Environmental Variables

For local development, create `.env`:
```
VERCEL_TOKEN=your_token_here
VERCEL_ORG_ID=your_org_here
VERCEL_PROJECT_ID=your_project_here
```

Then load before commands:
```bash
source .env
npm run deploy
```

## Next Steps

Once deployment is working:
1. Monitor deployments: https://github.com/ifranjo/Nlife/actions
2. Check site status: https://www.newlifesolutions.dev
3. View Vercel logs: https://vercel.com/[your-org]/[project]/deployments
4. Set up deployment notifications (optional)
