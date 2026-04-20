FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine

# Copy built app
COPY --from=builder /app/dist /usr/share/nginx/html

# Use template so BACKEND_URL can be injected at container start via envsubst
# nginx:alpine auto-processes /etc/nginx/templates/*.template on startup
COPY nginx.conf /etc/nginx/templates/default.conf.template

# Default backend URL — override with BACKEND_URL env var at runtime
ENV BACKEND_URL=http://cio_backend:3001

EXPOSE 80

# nginx entrypoint runs envsubst on templates then starts nginx
CMD ["/docker-entrypoint.sh", "nginx", "-g", "daemon off;"]
