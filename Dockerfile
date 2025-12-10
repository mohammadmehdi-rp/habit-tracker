# Dockerfile
FROM node:20

# Create app directory
WORKDIR /app

# Copy only package files first
COPY package*.json ./

# Install dependencies INSIDE the container (Linux build of sqlite3)
RUN npm install --omit=dev

# Now copy the rest of the source code (WITHOUT node_modules because of .dockerignore)
COPY . .

# Default command (overridden in docker-compose for each service)
CMD ["node", "services/gateway-service/index.js"]
