FROM mcr.microsoft.com/playwright:v1.58.2-noble

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./
COPY prisma ./prisma/
COPY prisma.config.ts ./

# Install dependencies
RUN npm ci

# Generate Prisma client
RUN npx prisma generate

# Copy the rest of the app
COPY . .

# Build Next.js
RUN npm run build

# Expose port
EXPOSE 8080

# Start
CMD ["sh", "-c", "npx prisma db push && npx next start -H 0.0.0.0 -p ${PORT:-8080}"]
