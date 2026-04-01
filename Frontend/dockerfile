FROM node:22

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

ENV PORT=5174

EXPOSE 5174

CMD ["npm", "run", "dev", "--", "--host"]
