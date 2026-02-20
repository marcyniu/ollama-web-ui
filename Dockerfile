# Multi-stage Dockerfile for Ollama Web UI

# Stage 1: Build the React application
FROM node:25 AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm config set strict-ssl false && npm install

# Copy source files
COPY . .

# Build the application
RUN npm run build

# Stage 2: Serve with Nginx (optionally with backend)
FROM nginx:alpine

# Install Node.js for the optional Model Manager backend
RUN apk add --no-cache nodejs

# Copy built frontend files from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy backend server
COPY server/index.js /app/server/index.js

# Copy nginx and entrypoint
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# Expose frontend port (8080) and optional backend port (3001)
EXPOSE 8080 3001

# Start via entrypoint (handles optional backend)
CMD ["/docker-entrypoint.sh"]
