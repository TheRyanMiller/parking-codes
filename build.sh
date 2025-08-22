#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Starting Parking Codes Development Environment${NC}"
echo "=================================================="

# Function to check if a port is in use
check_port() {
    if lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null ; then
        echo -e "${RED}❌ Port $1 is already in use${NC}"
        return 1
    else
        echo -e "${GREEN}✅ Port $1 is available${NC}"
        return 0
    fi
}

# Check if ports are available
echo -e "${YELLOW}Checking ports...${NC}"
check_port 3000 || exit 1
check_port 3001 || exit 1

# Function to handle cleanup on script exit
cleanup() {
    echo -e "\n${YELLOW}🛑 Stopping all processes...${NC}"
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
    exit 0
}

# Set up trap to handle Ctrl+C
trap cleanup SIGINT SIGTERM

# Start backend
echo -e "${YELLOW}Starting backend server...${NC}"
cd "$(dirname "$0")"
npm run dev &
BACKEND_PID=$!

# Wait a moment for backend to start
sleep 2

# Start frontend
echo -e "${YELLOW}Starting frontend development server...${NC}"
cd client
npm start &
FRONTEND_PID=$!

# Wait for both processes
echo -e "${GREEN}✅ Both servers are starting...${NC}"
echo -e "${BLUE}📱 Frontend: http://localhost:3000${NC}"
echo -e "${BLUE}🔧 Backend: http://localhost:3001${NC}"
echo -e "${YELLOW}Press Ctrl+C to stop both servers${NC}"

# Wait for both processes
wait $BACKEND_PID $FRONTEND_PID
