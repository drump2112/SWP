# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies (for native modules like bcrypt)
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package*.json ./

# Install ALL dependencies (including devDependencies for build)
RUN npm install

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Stage 2: Production
FROM node:20-alpine AS production

WORKDIR /app

# Install runtime dependencies (for native modules)
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package*.json ./

# Install production dependencies
RUN npm install --production && npm cache clean --force

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist

# Copy necessary config files
COPY --from=builder /app/ormconfig.ts ./ormconfig.ts

# Expose port
EXPOSE 3000

# Start the application
CMD ["node", "dist/main"]
