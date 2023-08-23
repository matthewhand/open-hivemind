
FROM node:16
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install
COPY . .
RUN mkdir -p commands
COPY commands/* ./commands/
CMD [ "node", "index.js" ]
