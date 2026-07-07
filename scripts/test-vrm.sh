#!/usr/bin/env bash
# Run the VRM app, load the file, capture console output, report results
set -e

VRM_PATH="${1:-/home/keless/Downloads/VRM-GLB-GLTF/AvatarSample_E.vrm}"
VITE_LOG="/tmp/vrm-test-vite.log"
ELEC_LOG="/tmp/vrm-test-electron.log"

# Clean up previous runs
pkill -f "npm exec electron" 2>/dev/null || true
pkill -f "npx vite" 2>/dev/null || true
sleep 1
rm -f "$VITE_LOG" "$ELEC_LOG"

echo "=== VRM Test Runner ==="
echo "VRM path: $VRM_PATH"
echo ""

# Start Vite
VITE_VRM_PATH="$VRM_PATH" npx vite &>"$VITE_LOG" &
VITE_PID=$!
echo "Vite started (PID $VITE_PID)"

# Wait for Vite
for i in $(seq 1 20); do
  if curl -s http://localhost:5173/ >/dev/null 2>&1; then
    echo "Vite ready after ${i}s"
    break
  fi
  sleep 1
done

# Start Electron
VITE_VRM_PATH="$VRM_PATH" VITE_DEV_SERVER_URL='http://localhost:5173/' npx electron . 2>&1 | tee "$ELEC_LOG" &
ELEC_PID=$!
echo "Electron started (PID $ELEC_PID)"

# Wait for VRM load
echo "Waiting for VRM load..."
sleep 20

# Analyze output
echo ""
echo "=== RESULTS ==="
echo ""

# Check for VRM load success
LOAD_LINES=$(grep -E "VRM Load|VRM data present|Model children|VRM loaded via IPC" "$ELEC_LOG" 2>/dev/null || true)
if [ -n "$LOAD_LINES" ]; then
  echo "VRM Load Output:"
  echo "$LOAD_LINES" | sed 's/^/  /'
else
  echo "  (no VRM load output found)"
fi

echo ""

# Check for errors
ERROR_COUNT=$(grep -cE "Global error|Uncaught|OOM|Error:" "$ELEC_LOG" 2>/dev/null || echo "0")
if [ "$ERROR_COUNT" -gt 0 ]; then
  echo "ERRORS FOUND ($ERROR_COUNT):"
  grep -E "Global error|Uncaught|OOM|Error:" "$ELEC_LOG" 2>/dev/null | sed 's/^/  /' | head -10
else
  echo "No errors found."
fi

echo ""

# Check memory
ELEC_MAIN=$(ps aux | grep "electron.*--type=renderer" | grep -v grep | head -1)
if [ -n "$ELEC_MAIN" ]; then
  RSS=$(echo "$ELEC_MAIN" | awk '{print $6}')
  echo "Renderer RSS: ${RSS} KB"
fi

echo ""
echo "=== FULL LOG ==="
cat "$ELEC_LOG"

echo ""
echo "=== DONE ==="
echo "Press Ctrl+C to stop, or the loop will restart..."
