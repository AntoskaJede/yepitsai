FROM node:20-slim AS builder

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM node:20-slim AS runner

WORKDIR /app
RUN mkdir -p /data

COPY package*.json ./
RUN npm install --production
COPY --from=builder /app/dist ./dist
COPY server.js ./

ENV DB_PATH=/data/yepitsai.db
ENV NODE_ENV=production

EXPOSE ${PORT:-3001}
CMD ["node", "server.js"]
