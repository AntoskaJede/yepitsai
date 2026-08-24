FROM node:20-slim

# Install build tools for better-sqlite3 + python3 pip (for yt-dlp transcript fallback)
RUN apt-get update && apt-get install -y python3 python3-pip make g++ && rm -rf /var/lib/apt/lists/*

# Install yt-dlp (YouTube transcript fallback — used when InnerTube + library both fail)
RUN pip3 install --no-cache-dir --break-system-packages yt-dlp

# Create data directory for SQLite
RUN mkdir -p /data

WORKDIR /app

# Install server deps
COPY server/package.json server/package-lock.json* ./server/
RUN cd server && npm install

# Install + build frontend
COPY frontend/package.json frontend/package-lock.json* ./frontend/
RUN cd frontend && npm install

COPY frontend/ ./frontend/
RUN cd frontend && npm run build

# Copy root public/ (robots.txt, llms.txt, sitemap.xml) for Express to serve
COPY public/ ./public/

COPY server/ ./server/

WORKDIR /app/server

ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

CMD ["node", "index.js"]
