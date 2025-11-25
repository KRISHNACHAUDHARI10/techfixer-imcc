# Use official lightweight Node image
FROM node:18-alpine

# Create app directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install only required dependencies
RUN npm install --production

# Copy rest of the project files
COPY . .

# Expose app port (your index.js uses 8081 or 5000)
EXPOSE 8081

# Start the app
CMD ["node", "index.js"]
