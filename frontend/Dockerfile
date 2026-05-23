FROM node:20-alpine AS build

WORKDIR /app
ARG REACT_APP_API_ORIGIN=http://localhost:5000
ENV REACT_APP_API_ORIGIN=$REACT_APP_API_ORIGIN
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:1.27-alpine
COPY --from=build /app/build /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
