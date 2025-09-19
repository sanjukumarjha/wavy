# --- STAGE 1: Build the Frontend ---
# Use a full Node.js 18 image which has all the necessary build tools
FROM node:18 as builder

# Set the working directory for the frontend build
WORKDIR /usr/src/app/frontend

# Copy only the package files for the frontend to leverage caching
COPY frontend/package*.json ./

# Install frontend dependencies cleanly
RUN npm install

# Copy the rest of the frontend source code
COPY frontend/. .

# Run the build command to create the final static files
RUN npm run build

# --- STAGE 2: Create the Final, Lightweight Production Server ---
# Use the lightweight "slim" image for the final server to save resources
FROM node:18-slim

# Install FFmpeg, which is required for the backend to run
RUN apt-get update && apt-get install -y ffmpeg

# Set the working directory for the server
WORKDIR /usr/src/app

# Copy only the backend's package files
COPY backend/package*.json ./backend/

# Install only the backend's production dependencies
RUN npm install --prefix backend --omit=dev

# Copy the backend source code
COPY backend/. ./backend/

# --- This is the magic step ---
# Copy the already-built frontend files from the "builder" stage into the final server
COPY --from=builder /usr/src/app/frontend/dist ./frontend/dist

# Expose the port Render will use
EXPOSE 10000

# The command to start the server
CMD [ "node", "backend/server.js" ]