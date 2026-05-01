#!/bin/bash

# Build and run with Docker Compose

echo "🐳 Building Youth Church Portal with Docker..."

# Build images
docker-compose build

# Start services
docker-compose up

# Run migrations (if needed)
# docker-compose exec app npm run prisma:migrate
# docker-compose exec app npm run prisma:seed

echo "✅ Application is running on http://localhost:3000"
echo "📖 API Docs available at http://localhost:3000/api-docs"
