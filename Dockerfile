# --- STAGE 1: Build the Frontend ---
# Use a full Node.js 18 image for building
FROM node:18 as builder

WORKDIR /usr/src/app

# Copy ONLY the package.json files to leverage Docker caching
COPY frontend/package.json ./frontend/
COPY backend/package.json ./backend/

# Install dependencies for both frontend and backend cleanly
# This will generate a new, compatible package-lock.json inside the container
RUN npm install --prefix frontend
RUN npm install --prefix backend

# Copy the rest of the source code
COPY . .

# Build the frontend
RUN npm run build --prefix frontend

# --- STAGE 2: Create the Final Production Server ---
# Use the lightweight "slim" image to save resources
FROM node:18-slim

# Install FFmpeg
RUN apt-get update && apt-get install -y ffmpeg

WORKDIR /usr/src/app

# Copy dependencies from the builder stage
COPY --from=builder /usr/src/app/frontend/node_modules ./frontend/node_modules
COPY --from=builder /usr/src/app/backend/node_modules ./backend/node_modules

# Copy the already-built frontend and the backend source code
COPY --from=builder /usr/src/app/frontend/dist ./frontend/dist
COPY backend/. ./backend/

# Expose the port Render uses
EXPOSE 10000

# The command to start the server
CMD [ "node", "backend/server.js" ]