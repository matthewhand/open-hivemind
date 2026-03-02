# Deployment Setup Guide

This document outlines the required secrets and setup instructions for your deployment targets.

## Required GitHub Secrets

### Fly.io Deployment
- `FLY_API_TOKEN`: Your Fly.io API token
  - Get it from: https://fly.io/user/personal_access_tokens

### Vercel Deployment
- `VERCEL_TOKEN`: Your Vercel API token
  - Get it from: https://vercel.com/account/tokens
- `VERCEL_ORG_ID`: Your Vercel organization ID
  - Found in your Vercel project settings
- `VERCEL_PROJECT_ID`: Your Vercel project ID
  - Found in your Vercel project settings

### Netlify Deployment
- `NETLIFY_AUTH_TOKEN`: Your Netlify API token
  - Get it from: https://app.netlify.com/user/applications
- `NETLIFY_SITE_ID`: Your Netlify site ID
  - Found in your Netlify site settings

### Docker Hub (for Fly.io deployments)
- `DOCKER_IO_USERNAME`: Your Docker Hub username
- `DOCKER_IO_AUTH`: Your Docker Hub access token
  - Get it from: https://hub.docker.com/settings/security

## Deployment Configuration

### Fixed Issues
1. **Vercel.json**: Removed invalid `deployments` property that was causing schema validation errors
2. **Netlify.toml**: Created proper configuration for frontend deployment
3. **CI/CD Workflows**: Consolidated deployment logic into a single workflow

### Deployment Targets

#### Fly.io (Full Application)
- Deploys the complete application with backend and frontend
- Uses Docker image from Docker Hub
- Configuration: `fly.toml`

#### Vercel (Frontend)
- Deploys frontend static files
- Configuration: `vercel.json`
- Build command: `npm run build:full`

#### Netlify (Frontend)
- Deploys frontend static files
- Configuration: `netlify.toml`
- Build command: `npm run build:full`

## Next Steps

1. Add all required secrets to your GitHub repository settings
2. Ensure your Docker Hub repository exists and is accessible
3. Test the deployment workflow by pushing to main branch
4. Monitor deployment logs for any remaining issues

## Troubleshooting

### Common Issues
- **Missing secrets**: Ensure all required secrets are added to GitHub
- **Build failures**: Check that `npm run build:full` works locally
- **Docker issues**: Verify Docker Hub credentials and repository access
- **Domain configuration**: Ensure custom domains are properly configured

### Testing Locally
```bash
# Test build process
npm run build:full

# Test Docker build
docker build -t your-username/open-hivemind .