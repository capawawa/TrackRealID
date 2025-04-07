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
ENV TRACKER_USE_API_SCRAPER=true
ENV TRACKER_DYNAMIC_INTERVALS=true
ENV TRACKER_MIN_INTERVAL=2
ENV TRACKER_MAX_INTERVAL=30
ENV TRACKER_BUSINESS_HOURS_START=8
ENV TRACKER_BUSINESS_HOURS_END=18
ENV TRACKER_RANDOMIZE_INTERVAL=true
ENV TRACKER_JITTER_PERCENT=20

# Run the application
CMD ["node", "src/index.js"]
