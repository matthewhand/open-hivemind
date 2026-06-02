#!/bin/sh
while true; do
  node dist/src/index.js
  echo 'Process crashed. Restarting in 300 seconds...'
  sleep 300
done
