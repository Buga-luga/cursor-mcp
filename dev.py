import os
import subprocess
import sys

print("Starting MCP server...")
try:
    if sys.platform == 'win32':
        subprocess.run('npm start "E:\\Programming"', shell=True)
    else:
        subprocess.run(['npm', 'start', 'E:\\Programming'])
except KeyboardInterrupt:
    print("\nShutting down server...") 