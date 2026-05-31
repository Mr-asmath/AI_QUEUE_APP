FROM node:20-alpine AS build

WORKDIR /app
ARG REACT_APP_API_ORIGIN=http://localhost:5000
ENV REACT_APP_API_ORIGIN=$REACT_APP_API_ORIGIN
COPY package*.json ./
RUN npm config set registry https://registry.npmjs.org/ \
  && npm config set fetch-retries 5 \
  && npm config set fetch-retry-factor 2 \
  && npm config set fetch-retry-mintimeout 20000 \
  && npm config set fetch-retry-maxtimeout 120000 \
  && npm config set fetch-timeout 300000
RUN for attempt in 1 2 3; do \
    npm ci --prefer-offline --no-audit --no-fund && break; \
    if [ "$attempt" = "3" ]; then exit 1; fi; \
    sleep $((attempt * 20)); \
  done
COPY . .
RUN npm run build

FROM nginx:1.27-alpine
COPY --from=build /app/build /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
