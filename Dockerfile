
FROM node:16
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install
COPY troubleshoot.sh /usr/src/app/troubleshoot.sh
RUN chmod +x /usr/src/app/troubleshoot.sh
RUN /usr/src/app/troubleshoot.sh
COPY . .
CMD [ "node", "index.js" ]
