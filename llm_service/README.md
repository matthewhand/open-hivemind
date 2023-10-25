# LLM Service

This service facilitates interaction with a language model, either through a Cloudflare worker or the Perplexity API.

## Option 1: Deploying on Cloudflare

### Requirements

- Cloudflare account
- [Wrangler CLI](https://developers.cloudflare.com/workers/cli-wrangler/install-update) installed

### Deployment Steps

1. **Configuration**:
   - Update the `wrangler.toml` file with your Cloudflare account ID.
   - Ensure the environment variable settings in `cloudflare.js` are correctly set.

2. **Login to Cloudflare**:
   ```bash
   wrangler login
