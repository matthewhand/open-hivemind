# User Guide

This guide provides advanced configuration and usage details for Open-Hivemind.

## Complex Configuration

Delve into advanced configuration scenarios including:
- Multi‑agent setups using Open‑Swarm.
- Detailed environment variable customization.
- Integration with multiple messaging platforms (Discord, Slack, etc.).
- Troubleshooting configuration issues.

### Environment Variables

Review the `.env` file to understand the following options:
- **MESSAGE_PROVIDER:** Choose between Discord and Slack.
- **LLM_PROVIDER:** Options include openai, flowise, openwebui, or open-swarm.
- Platform-specific tokens and overrides.
- Rate limiting and messaging behavior settings.

## Usage

Learn how to make the most of Open-Hivemind:
- How to start the bot and monitor its activity.
- Advanced command usage and message handling.
- Debugging tips for troubleshooting common issues.

## Testing and Quality Assurance

Open-Hivemind is thoroughly tested using a comprehensive suite of Jest test cases. These tests ensure:
- Proper bot initialization and multi‑agent functionality.
- Accurate message scheduling and event handling.
- Graceful shutdown and resource management.
To run the tests, execute:
```bash
npm run test
```
Review the test outputs to verify that all core functionalities operate correctly. This section aids in troubleshooting issues and ensures that any changes align with quality standards.

## Advanced Topics

- Custom integrations for additional LLMs and messaging platforms.
- Enhancing multi‑agent functionality.
- Extending the bot with your own modules.

## Troubleshooting

A collection of common configuration and usage issues along with their solutions.

For further details, refer to the repository documentation.