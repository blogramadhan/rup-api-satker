# Menggunakan Node.js 18 Alpine untuk ukuran image yang lebih kecil
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Install dependencies sistem yang diperlukan
RUN apk add --no-cache \
    curl \
    tzdata

# Set timezone ke Asia/Jakarta
ENV TZ=Asia/Jakarta

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy source code
COPY src/ ./src/

# Create non-root user untuk keamanan
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Change ownership ke nodejs user
RUN chown -R nodejs:nodejs /app
USER nodejs

# Expose port (akan dikonfigurasi melalui environment variable)
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:${PORT:-8080}/health || exit 1

# Start aplikasi
CMD ["node", "src/index.js"]
