FROM node:20

WORKDIR /app

COPY package*.json ./

RUN npm i && npm run build

COPY . .

ENV PORT=3000

EXPOSE 3000

CMD ["node", "dist/src/main.js"]

LABEL authors="amramoudi"