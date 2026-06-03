# Changelog

## Unreleased

### ⚠️ Breaking Changes

- **Webhook IP Whitelist is now default-deny**: `WEBHOOK_IP_WHITELIST` being empty previously allowed all IPs. It now blocks all requests with a 403. Set `WEBHOOK_IP_WHITELIST=0.0.0.0/0` to restore open access, or list specific IPs. See `.env.sample` for examples.
