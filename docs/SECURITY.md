
## SSRF Protection

The application implements comprehensive Server-Side Request Forgery (SSRF) protection across all LLM integration packages.

### Protected Components

- `@hivemind/llm-openai`
- `@hivemind/llm-flowise`
- `@hivemind/llm-openwebui`
- `@hivemind/llm-openswarm`
- `@hivemind/message-slack`
- `@hivemind/message-mattermost`

### Protection Mechanisms

1. **Private IP Blocking**: All requests to private IP ranges are blocked:
   - 10.0.0.0/8 (Class A private)
   - 172.16.0.0/12 (Class B private)
   - 192.168.0.0/16 (Class C private)
   - 127.0.0.0/8 (Loopback)
   - 169.254.0.0/16 (Link-local)

2. **IPv6 Protection**: 
   - ::1 (Loopback)
   - fc00::/7 (Unique local)
   - fe80::/10 (Link-local)

3. **Protocol Whitelist**: Only HTTP/HTTPS and WS/WSS protocols allowed

4. **DNS Rebinding Prevention**: Hostnames are resolved to IPs before validation

### Configuration

To allow local network access during development:
```bash
ALLOW_LOCAL_NETWORK_ACCESS=true
```

