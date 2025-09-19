# 1. Start with a Node.js 18 base image
FROM node:18-slim

# 2. Install FFmpeg
# This runs system commands to add the FFmpeg package to the server
RUN apt-get update && apt-get install -y ffmpeg

# 3. Set up the working directory inside the container
WORKDIR /usr/src/app

# 4. Copy all package.json and package-lock.json files
COPY package*.json ./
COPY backend/package*.json ./backend/
COPY frontend/package*.json ./frontend/

# 5. Install all dependencies for all parts of the project
RUN npm install
RUN npm run install-backend
RUN npm run install-frontend

# 6. Copy the rest of your project code into the container
COPY . .

# 7. Build the React frontend
RUN npm run build

# 8. Expose the port the server will run on
EXPOSE 3001

# 9. The command to start the server
CMD [ "npm", "start" ]