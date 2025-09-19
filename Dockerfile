# 1. Start with a Node.js 18 base image
FROM node:18-slim

# 2. Install FFmpeg
RUN apt-get update && apt-get install -y ffmpeg

# 3. Set up the working directory
WORKDIR /usr/src/app

# 4. Copy all project files
COPY . .

# 5. Install all dependencies from the root
RUN npm install

# 6. Build the React frontend
RUN npm run build

# 7. Expose the port
EXPOSE 10000

# 8. The command to start the server
CMD [ "npm", "start" ]