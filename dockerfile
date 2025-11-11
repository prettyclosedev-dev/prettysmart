# Use the latest LTS version of Node.js
FROM node:20-bullseye

# Set the working directory
RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

# Install dependencies
COPY package*.json /usr/src/app/
RUN npm install -g sass --verbose
RUN npm install --verbose

# Copy files
COPY . /usr/src/app

# Expose the port the app runs on
EXPOSE 10000

# Build css
RUN npm run sass

# Start the application
CMD ["node", "app.js"]