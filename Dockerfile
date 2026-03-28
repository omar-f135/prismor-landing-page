# Use official Node.js LTS image
FROM node:20-alpine

# Create app directory
WORKDIR /app

# Install dependencies first (cached layer)
COPY package*.json ./
RUN npm ci --omit=dev

# Copy the rest of the app
COPY . .

# Create directories that the app needs at runtime
RUN mkdir -p data/products uploads

# Cloud Run injects PORT env variable
ENV PORT=8080
EXPOSE 8080

CMD ["node", "server.js"]
