# Generated by https://smithery.ai. See: https://smithery.ai/docs/config#dockerfile
# Use an official Node.js image as the base image
FROM node:18-alpine AS builder

# Set the working directory
WORKDIR /app

# Copy package.json and package-lock.json for installing dependencies
COPY package.json package-lock.json ./

# Install dependencies
RUN npm install

# Copy the TypeScript source code
COPY src ./src
COPY tsconfig.json ./

# Build the TypeScript code
RUN npm run build

# Use a smaller Node.js runtime image for the final build
FROM node:18-alpine

# Set the working directory
WORKDIR /app

# Copy the compiled code from the builder stage
COPY --from=builder /app/build ./build

# Copy package.json and package-lock.json for production dependencies
COPY --from=builder /app/package.json /app/package-lock.json ./

# Install only production dependencies
RUN npm ci --omit=dev

# Expose the port that the app runs on
EXPOSE 3000

# Start the application
CMD ["node", "build/index.js"]