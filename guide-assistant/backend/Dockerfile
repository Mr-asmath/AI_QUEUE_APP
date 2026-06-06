FROM node:20-alpine

WORKDIR /app/backend

ENV NODE_ENV=production
ENV GUIDE_DATA_DIR=/app/data

COPY backend/package*.json ./
RUN npm config set fetch-retries 5 \
  && npm config set fetch-retry-mintimeout 20000 \
  && npm config set fetch-retry-maxtimeout 120000 \
  && npm config set fetch-timeout 300000
RUN npm ci --omit=dev --no-audit --no-fund

COPY backend ./
COPY data /app/data

EXPOSE 5050

CMD ["node", "server.js"]
