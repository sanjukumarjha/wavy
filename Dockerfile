# --- STAGE 1: Build the Frontend ---
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
FROM node:18-slim

# Install FFmpeg (needed for backend)
RUN apt-get update && apt-get install -y ffmpeg && rm -rf /var/lib/apt/lists/*

# Set the working directory for the server
WORKDIR /usr/src/app

# Copy only the backend's package files
COPY backend/package*.json ./backend/

# Install only the backend's production dependencies
RUN npm install --prefix backend --omit=dev

# Copy the backend source code
COPY backend/. ./backend/

# Copy the already-built frontend files from the "builder" stage
COPY --from=builder /usr/src/app/frontend/dist ./frontend/dist

# Expose the port Render will use
EXPOSE 10000

# Start the backend server
CMD [ "node", "backend/server.js" ]
