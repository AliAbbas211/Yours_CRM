FROM node:20-alpine

# Install OpenSSL for Prisma compatibility
RUN apk add --no-cache openssl

# Set working directory
WORKDIR /app

# Copy root package.json
COPY package*.json ./

# Copy frontend and backend package files
COPY frontend/package*.json ./frontend/
COPY backend/package*.json ./backend/

# Install dependencies (including devDependencies for ts-node and building)
RUN npm install
RUN npm install --prefix frontend
RUN npm install --prefix backend

# Copy the rest of the application code
COPY . .

# Generate Prisma Client
RUN cd backend && npx prisma generate

# Build frontend
RUN npm run build --prefix frontend

# Expose frontend and backend ports
EXPOSE 3000
EXPOSE 5000

# Start both services
CMD ["npm", "start"]
