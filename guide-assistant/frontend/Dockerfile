FROM node:20-alpine AS build

WORKDIR /app/frontend

ARG VITE_API_BASE_URL=http://localhost:5050
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

COPY frontend/package*.json ./
RUN npm config set fetch-retries 5 \
  && npm config set fetch-retry-mintimeout 20000 \
  && npm config set fetch-retry-maxtimeout 120000 \
  && npm config set fetch-timeout 300000
RUN npm ci --no-audit --no-fund

COPY frontend ./
RUN npm run build

FROM nginx:1.27-alpine

COPY --from=build /app/frontend/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
