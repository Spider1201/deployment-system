FROM node:22

WORKDIR /app

# Install git for cloning repositories
RUN apt-get update && apt-get install -y git && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json* ./
RUN npm install

COPY . .

EXPOSE 5000

CMD ["npm", "run", "start"]