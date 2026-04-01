FROM node:22

WORKDIR /app

# Copy from Backend subfolder explicitly
COPY Backend/package*.json ./

RUN npm install

COPY Backend/ .

ENV PORT=8080

EXPOSE 8080

CMD ["node", "server.js"]