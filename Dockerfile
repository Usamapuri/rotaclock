FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package.json .npmrc ./

# Install dependencies with legacy peer deps
RUN npm install --legacy-peer-deps

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Expose platform port (Railway uses 8080)
EXPOSE 8080

# Start the application binding to platform PORT and 0.0.0.0
CMD ["sh","-c","npx next start -p ${PORT:-8080} -H 0.0.0.0"]
