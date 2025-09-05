FROM node:20-bookworm-slim
RUN apt-get update -y && apt-get install -y --no-install-recommends curl ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY server.js ./
CMD ["node","/app/server.js"]
