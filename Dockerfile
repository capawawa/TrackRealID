FROM node:18-alpine

# Create app directory
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy application code
COPY . .

# Set environment variables
ENV NODE_ENV=production
# Default values for required environment variables
ENV TRACKER_CHECK_INTERVAL=10
ENV TRACKER_LOG_FILE=tracker.log

# Run the application
CMD ["node", "src/index.js"]
