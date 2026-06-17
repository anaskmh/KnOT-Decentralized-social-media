#!/usr/bin/env bash

# Exit immediately if a command exits with a non-zero status
set -e

# Define color codes for pretty output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${BLUE}==================================================${NC}"
echo -e "${BLUE}           Starting KnOT Application              ${NC}"
echo -e "${BLUE}==================================================${NC}"

# Check requirements
echo -e "\n${CYAN}[1/4] Checking system requirements...${NC}"

if ! command -v python3 &> /dev/null; then
    echo -e "${RED}Error: python3 is not installed. Please install Python 3.${NC}"
    exit 1
fi

if ! command -v node &> /dev/null; then
    echo -e "${RED}Error: Node.js is not installed. Please install Node.js.${NC}"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo -e "${RED}Error: npm is not installed. Please install npm.${NC}"
    exit 1
fi

echo -e "${GREEN}✓ System requirements met.${NC}"

# Setup backend environment
echo -e "\n${CYAN}[2/4] Setting up Backend Relay...${NC}"
if [ ! -d "backend/venv" ]; then
    echo -e "${YELLOW}Virtual environment not found. Creating backend/venv...${NC}"
    python3 -m venv backend/venv
fi

echo -e "${YELLOW}Checking/installing backend dependencies...${NC}"
backend/venv/bin/pip install -r backend/requirements.txt

echo -e "${GREEN}✓ Backend environment ready.${NC}"

# Setup frontend environment
echo -e "\n${CYAN}[3/4] Setting up Frontend Web Client...${NC}"
if [ ! -d "frontend/node_modules" ]; then
    echo -e "${YELLOW}node_modules not found in frontend. Running npm install...${NC}"
    (cd frontend && npm install)
else
    echo -e "${GREEN}✓ node_modules already installed in frontend.${NC}"
fi

echo -e "${GREEN}✓ Frontend environment ready.${NC}"

# Free up ports if they are in use
if command -v lsof &> /dev/null; then
    echo -e "\n${CYAN}[3.5/4] Checking and freeing up ports...${NC}"
    for PORT in 8765 5173; do
        PIDS=$(lsof -t -i :$PORT || true)
        if [ -n "$PIDS" ]; then
            echo -e "${YELLOW}Port $PORT is in use. Freeing it up (killing process(es): $PIDS)...${NC}"
            for PID in $PIDS; do
                kill -9 "$PID" 2>/dev/null || true
            done
        fi
    done
    echo -e "${GREEN}✓ Ports are clear.${NC}"
fi

# Run services
echo -e "\n${CYAN}[4/4] Starting services...${NC}"

# PIDs to clean up
BACKEND_PID=""
FRONTEND_PID=""

# Cleanup function to terminate background processes on exit
cleanup() {
    echo -e "\n${YELLOW}Shutting down processes...${NC}"
    if [ -n "$BACKEND_PID" ]; then
        echo -e "Stopping Backend Relay (PID: $BACKEND_PID)..."
        kill "$BACKEND_PID" 2>/dev/null || true
    fi
    if [ -n "$FRONTEND_PID" ]; then
        echo -e "Stopping Frontend Web Client (PID: $FRONTEND_PID)..."
        kill "$FRONTEND_PID" 2>/dev/null || true
    fi
    echo -e "${GREEN}All services stopped. Goodbye!${NC}"
    exit 0
}

# Trap SIGINT (Ctrl+C) and SIGTERM
trap cleanup SIGINT SIGTERM

# Start backend relay
echo -e "${YELLOW}Starting Backend Nostr Relay...${NC}"
(
    cd backend/relay
    exec ../venv/bin/python server.py
) &
BACKEND_PID=$!

# Give backend a moment to start
sleep 1.5

# Start frontend dev server
echo -e "${YELLOW}Starting Frontend Web Client...${NC}"
(
    cd frontend
    exec npm run dev
) &
FRONTEND_PID=$!

echo -e "\n${GREEN}==================================================${NC}"
echo -e "${GREEN}  KnOT App is running!${NC}"
echo -e "  - ${CYAN}Backend Nostr Relay:${NC} ws://127.0.0.1:8765"
echo -e "  - ${CYAN}Frontend Web Client:${NC} http://localhost:5173"
echo -e "${GREEN}==================================================${NC}"
echo -e "${YELLOW}Press Ctrl+C to stop both backend and frontend.${NC}\n"

# Wait for background processes to finish (which they won't unless killed or crash)
wait
