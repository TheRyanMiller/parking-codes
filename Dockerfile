FROM node:18

WORKDIR /app

# Install server dependencies
COPY server/package*.json ./server/
RUN cd server && npm ci --only=production

# Create client directory and install dependencies
RUN mkdir -p client
COPY client/package*.json ./client/
RUN cd client && npm ci

# Build client
COPY client/ ./client/
RUN cd client && npm run build

# Copy built client to server public folder
RUN mkdir -p server/public && cp -r client/build/* server/public/

# Copy server code
COPY server/ ./server/

WORKDIR /app/server

EXPOSE 3001

CMD ["npm", "start"]