"""
HarvestLink AI — Unified Single Launcher
Starts both Frontend and Backend concurrently in ONE window and opens your browser.
"""
import os
import sys
import subprocess
import time
import webbrowser
import threading

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.join(BASE_DIR, "backend")
FRONTEND_DIR = os.path.join(BASE_DIR, "frontend")

# Use venv python if available
VENV_PYTHON = os.path.join(BACKEND_DIR, "venv", "Scripts", "python.exe")
PYTHON_EXE = VENV_PYTHON if os.path.exists(VENV_PYTHON) else sys.executable

print("=" * 65)
print("   HARVESTLINK AI - ALL-IN-ONE PLATFORM LAUNCHER")
print("=" * 65)
print("\n[1/3] Checking and seeding database...")

try:
    subprocess.run([PYTHON_EXE, "seed_data.py"], cwd=BACKEND_DIR, check=True)
except Exception as e:
    print(f"Database note: {e}")

print("\n[2/3] Starting Frontend Dev Server (Port 5173)...")
def run_frontend():
    npm_cmd = "npm.cmd" if os.name == "nt" else "npm"
    node_modules = os.path.join(FRONTEND_DIR, "node_modules")
    if not os.path.exists(node_modules):
        print("Installing frontend packages (npm install)...")
        subprocess.run([npm_cmd, "install"], cwd=FRONTEND_DIR, shell=True)
    subprocess.run([npm_cmd, "run", "dev"], cwd=FRONTEND_DIR, shell=True)

frontend_thread = threading.Thread(target=run_frontend, daemon=True)
frontend_thread.start()

print("\n[3/3] Starting Backend API Server (Port 8000)...")

def open_browser():
    time.sleep(3)
    url = "http://localhost:5173/"
    print(f"\n>>> OPENING IN BROWSER: {url} <<<\n")
    webbrowser.open(url)

browser_thread = threading.Thread(target=open_browser, daemon=True)
browser_thread.start()

print("=" * 65)
print("  APP RUNNING! Keep this window open.")
print("  URL: http://localhost:5173/farmer-dashboard")
print("=" * 65 + "\n")

# Run FastAPI / Uvicorn in the main thread
sys.path.insert(0, BACKEND_DIR)
os.chdir(BACKEND_DIR)

try:
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=False)
except ImportError:
    subprocess.run([PYTHON_EXE, "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"], cwd=BACKEND_DIR)
