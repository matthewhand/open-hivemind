# Development Guide

This document provides guidelines and best practices for developing and testing Open-Hivemind.

## Unit Testing & Test Coverage

Open-Hivemind includes a robust suite of 33 Jest test suites that cover core functionality, multi-bot behavior, message scheduling logic, and graceful shutdown procedures. Key points:

- **Test Objectives:**  
  Validate bot initialization, proper message routing and scheduling, and clean disconnection of bot clients.  
- **Key Test Cases Include:**  
  - Multi-bot initialization and splitting of tokens with correct username assignment.  
  - Accurate invocation of message scheduling via MessageDelayScheduler based on invitations and wakeword detection.  
  - Verification of proper event handling and shutdown sequences.
- **Running Tests:**  
  To run tests, execute:
  ```bash
  npm run test
  ```
  For Python-based projects, use:
  ```bash
  uv run pytest
  ```
- **Interpreting Test Results:**  
  Successful tests indicate reliable operation. In case of failures, refer to the debug logs and the configuration settings (such as environment variables) for troubleshooting.

## Development Environment

- Use Node.js v18 or later.
- Adhere to ESLint rules and the project's coding standards.
- Enable debugging with:
  ```bash
  DEBUG=app:* npm start
  ```

## Contribution Guidelines

- Follow the repository’s style and documentation standards.
- Write tests for new features and bug fixes.
- Use clear, descriptive commit messages.