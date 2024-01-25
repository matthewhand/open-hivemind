# ---- Build Python Environment ----
FROM python:3.9-slim-buster AS python-env
WORKDIR /usr/src/python-env
RUN apt-get update && apt-get install -y gcc python3-dev
RUN pip install --no-cache-dir psutil requests bs4 opencv-python numpy nltk

# ---- Build Node Environment ----
FROM node:18-buster
WORKDIR /usr/src/app

# Copy Python environment
COPY --from=python-env /usr/local /usr/local

# Install Node dependencies
COPY package*.json ./
RUN npm install
RUN npm install axios
RUN npm install chalk

# Copy app source from src to root in the container
COPY src/ .

# Copy commands
#RUN mkdir -p slashCommands
#COPY src/slashCommands/* ./slashCommands/

CMD [ "node", "index.js" ]
#CMD [ "node", "watcher.js" ]
