timeout /t 3800 /nobreak
git pull
docker-compose down
docker rmi discord-llm-bot --force
docker-compose build
docker-compose up -d
docker-compose logs -f