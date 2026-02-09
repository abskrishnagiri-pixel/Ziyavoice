# Use Node 20 (matches your dependencies)
FROM node:20

# Set working directory
WORKDIR /app

# Install ffmpeg for audio conversion (Sarvam TTS + ElevenLabs MP3 -> Twilio µ-law)
RUN apt-get update && \
    apt-get install -y ffmpeg && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Copy package files first for caching
COPY package.json package-lock.json* ./

# Install dependencies using npm install (NOT npm ci)
RUN npm install

# Copy the rest of the project
COPY . .

# Expose Railway's default port
EXPOSE 3000

# Start server
CMD ["npm", "start"]
