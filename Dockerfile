# --- STAGE 1: Build the Frontend ---
# Use a full Node.js 18 image for building
FROM node:18 as builder

WORKDIR /usr/src/app

# Copy ONLY the package.json for the frontend
COPY frontend/package.json ./frontend/

# Install frontend dependencies cleanly. This creates a new, compatible lockfile.
RUN npm install --prefix frontend

# Copy the rest of the frontend source code
COPY frontend/. ./frontend/

# Build the frontend
RUN npm run build --prefix frontend

# --- STAGE 2: Create the Final Production Server ---
# Use the lightweight "slim" image to save resources
FROM node:18-slim

# Install FFmpeg
RUN apt-get update && apt-get install -y ffmpeg

WORKDIR /usr/src/app

# Copy ONLY the package.json for the backend
COPY backend/package.json ./backend/

# Install ONLY production dependencies for the backend
RUN npm install --prefix backend --omit=dev

# Copy the backend source code
COPY backend/. ./backend/

# Copy the already-built frontend from the builder stage
COPY --from=builder /usr/src/app/frontend/dist ./frontend/dist

# Expose the port Render uses
EXPOSE 10000

# The command to start the server
CMD [ "node", "backend/server.js" ]