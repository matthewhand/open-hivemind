#!/bin/bash
PORT=${PORT:-3028}
for i in {1..30}; do
  if curl -s "http://localhost:$PORT" > /dev/null; then
    echo "Server is up on port $PORT"
    exit 0
  fi
  sleep 2
done
echo "Server didn't come up on port $PORT"
exit 1
