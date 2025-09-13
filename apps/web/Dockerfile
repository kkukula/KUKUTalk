# apps/web/Dockerfile
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# wa?ne: buduj z baz? /api, aby nginx m?g? proxowa?
ENV VITE_API_URL=/api
RUN npm run build

FROM nginx:alpine
COPY nginx.conf /etc/nginx/nginx.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s --start-period=15s --retries=5 CMD wget -qO- http://localhost/ || exit 1
