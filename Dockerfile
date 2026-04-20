FROM node:20-alpine
WORKDIR /app

# Install dependencies first for Docker caching
COPY package*.json ./
RUN npm install

# Copy all source files
COPY . .

# Build both frontend and backend
# Make sure tsup config builds backend to dist/server
RUN npm run build
RUN npm run build:server

EXPOSE 8080

# Run the compiled backend Express node script
# (Crucial fix: Using .js extension for the compiled typescript file)
CMD ["node", "dist/server/server.js"]
