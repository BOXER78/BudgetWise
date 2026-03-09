#!/bin/bash
export PATH="/opt/homebrew/bin:$PATH"

echo "=========================================="
echo "   Starting BudgetWise Local Servers      "
echo "=========================================="

echo "[1/2] Starting Backend Server..."
cd backend && npm run dev &
BACKEND_PID=$!

echo "[2/2] Starting Frontend Server..."
cd frontend && npm run dev &
FRONTEND_PID=$!

echo "=========================================="
echo "   Press Ctrl+C to stop both servers      "
echo "=========================================="

# Wait for both processes
wait $BACKEND_PID $FRONTEND_PID



