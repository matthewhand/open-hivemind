
#!/bin/bash
echo 'Running Troubleshoot Script'
if [ -z "$ALLOWED_USERS" ]; then
  echo 'ERROR: ALLOWED_USERS environment variable is not set.'
  exit 1
fi
echo 'Environment variable ALLOWED_USERS is set.'
echo 'Node.js version:'
node --version
echo 'NPM version:'
npm --version
echo 'Current directory content:'
ls -la
