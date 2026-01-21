# Base stage: Build the application
FROM node:22-alpine AS build

WORKDIR /app

# Install deps
COPY package*.json ./
RUN npm install

# Copy source (client + server + config)
COPY . .

# Build server TS + client Vite bundle
RUN npm run build

# Runtime stage: Serve the application
FROM node:22-alpine

WORKDIR /app

# Install only prod deps
COPY package*.json ./
RUN npm install --omit=dev

# Copy built artifacts
COPY --from=build /app/dist ./dist
COPY --from=build /app/server/dist ./server/dist

EXPOSE 3000

CMD ["node", "server/dist/server.js"]
