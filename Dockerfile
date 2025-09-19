# 1. Start with a Node.js 18 base image
FROM node:18-slim

# 2. Install FFmpeg
RUN apt-get update && apt-get install -y ffmpeg

# 3. Set up the working directory
WORKDIR /usr/src/app

# 4. Copy all package configuration files
COPY package*.json ./
COPY frontend/package*.json ./frontend/
COPY backend/package*.json ./backend/

# 5. Install backend and frontend dependencies separately and cleanly
RUN npm install --prefix backend
RUN npm install --prefix frontend

# 6. Copy the rest of your project source code
COPY . .

# 7. Build the React frontend
RUN npm run build --prefix frontend

# 8. Expose the port Render uses
EXPOSE 10000

# 9. The command to start the server
CMD [ "node", "backend/server.js" ]