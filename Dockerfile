# ==========================================
# STAGE 1: Build the React Frontend
# ==========================================
FROM node:18-bullseye AS frontend-builder

WORKDIR /app/frontend
# Copy frontend dependency files
COPY frontend/package*.json ./
RUN npm install

# Copy the rest of the frontend code and build
COPY frontend/ ./
RUN npm run build


# ==========================================
# STAGE 2: Setup Backend & Puppeteer Environment
# ==========================================
FROM node:18-bullseye-slim

# Install system dependencies required by Puppeteer/Chromium to run headlessly in Docker
RUN apt-get update && apt-get install -y \
    gconf-service \
    libgbm-dev \
    libasound2 \
    libatk1.0-0 \
    libc6 \
    libcairo2 \
    libcups2 \
    libdbus-1-3 \
    libexpat1 \
    libfontconfig1 \
    libgcc1 \
    libgconf-2-4 \
    libgdk-pixbuf2.0-0 \
    libglib2.0-0 \
    libgtk-3-0 \
    libnspr4 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libstdc++6 \
    libx11-6 \
    libx11-xcb1 \
    libxcb1 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxi6 \
    libxrandr2 \
    libxrender1 \
    libxss1 \
    libxtst6 \
    ca-certificates \
    fonts-liberation \
    libappindicator1 \
    libnss3 \
    lsb-release \
    xdg-utils \
    wget \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app/backend

# Copy backend dependency files
COPY backend/package*.json ./
RUN npm install

# Copy the backend source code
COPY backend/ ./

# Copy the built React frontend from Stage 1 into the backend's 'public' folder
COPY --from=frontend-builder /app/frontend/dist ./public

# Railway dynamically assigns the PORT environment variable. We default to 3001 if missing.
ENV PORT=3001
EXPOSE 3001

# Start the Node server
CMD ["node", "server.js"]
