# Build stage
FROM node:18-alpine AS build

WORKDIR /app

# Declare build arguments for Azure AD configuration with default mock values
ARG REACT_APP_AZURE_CLIENT_ID="mock_client_id"
ARG REACT_APP_AZURE_AUTHORITY="https://login.microsoftonline.com/common"
ARG REACT_APP_USE_MOCK_AUTH="true"

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the code
COPY . .

# Set environment variables for the React app (these will use the ARGs if not overridden by K8s)
ENV REACT_APP_API_URL=https://document-analyzer-backend.localhost
ENV REACT_APP_AZURE_CLIENT_ID=${REACT_APP_AZURE_CLIENT_ID}
ENV REACT_APP_AZURE_AUTHORITY=${REACT_APP_AZURE_AUTHORITY}
ENV REACT_APP_USE_MOCK_AUTH=${REACT_APP_USE_MOCK_AUTH}

# Build the React app
RUN npm run build

# Production stage - Using nginx for serving the static files and API routing
FROM nginx:alpine

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built assets from the build stage
COPY --from=build /app/build /usr/share/nginx/html

# Create directories for nginx logs
RUN mkdir -p /var/log/nginx

# Expose port 80
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
