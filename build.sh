#!/bin/bash
# build.sh
DOCKER_USERNAME="orhershko"
set -e
echo "Building the base image from project root..."
docker build -f api/Dockerfile -t $DOCKER_USERNAME/holdingsview-base:latest .

echo "Tagging image for API..."
docker tag $DOCKER_USERNAME/holdingsview-base:latest $DOCKER_USERNAME/holdingsview-api:latest

echo "Tagging image for Worker..."
docker tag $DOCKER_USERNAME/holdingsview-base:latest $DOCKER_USERNAME/holdingsview-worker:latest

echo "Pushing API image to Docker Hub..."
docker push $DOCKER_USERNAME/holdingsview-api:latest

echo "Pushing Worker image to Docker Hub..."
docker push $DOCKER_USERNAME/holdingsview-worker:latest

echo "Build and push complete!"