FROM node:24-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src
COPY scripts ./scripts

RUN npm run build

EXPOSE 4000

CMD ["sh", "-c", "npm run migration:run && node dist/server.js"]
