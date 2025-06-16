# Use Node.js 18 Alpine as base image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code (excluding node_modules via .dockerignore)
COPY . .

# Expose port 8080 (Vite dev server default)
EXPOSE 8080

# Default command for development
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"] 