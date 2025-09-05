FROM node:18-alpine

WORKDIR /app

# Copy package files and install deps
COPY package.json .npmrc ./
RUN npm install --legacy-peer-deps

# Copy source
COPY . .

# Build Next.js app
RUN npm run build

# Railway routes traffic to PORT (8080 on platform)
EXPOSE 8080

# Start binding to 0.0.0.0 and platform port
CMD ["sh","-c","npx next start -p ${PORT:-8080} -H 0.0.0.0"]


