#!/bin/bash
set -e

echo "Installing client dependencies..."
cd client
npm install

echo "Building React app with explicit react-scripts..."
./node_modules/.bin/react-scripts build

echo "Copying build to public..."
cd ..
mkdir -p public
cp -r client/build/* public/

echo "Build complete!"