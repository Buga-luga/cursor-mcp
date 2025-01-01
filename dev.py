import os
import subprocess
import sys
import time

def run_server():
    print("Starting MCP server...")
    try:
        if sys.platform == 'win32':
            server_process = subprocess.Popen('npm start "E:\\Programming"', shell=True)
            # Give the server a moment to start up
            time.sleep(2)
            # Start the Inspector
            inspector_process = subprocess.Popen('npx @modelcontextprotocol/inspector node dist/index.js "E:\\Programming"', shell=True)
            
            # Wait for either process to complete
            server_process.wait()
            inspector_process.wait()
        else:
            server_process = subprocess.Popen(['npm', 'start', 'E:\\Programming'])
            time.sleep(2)
            inspector_process = subprocess.Popen(['npx', '@modelcontextprotocol/inspector', 'node', 'dist/index.js', 'E:\\Programming'])
            
            server_process.wait()
            inspector_process.wait()
    except KeyboardInterrupt:
        print("\nShutting down server and inspector...")
        if sys.platform == 'win32':
            # On Windows, we need to terminate the processes explicitly
            subprocess.run('taskkill /F /T /PID {}'.format(server_process.pid), shell=True)
            subprocess.run('taskkill /F /T /PID {}'.format(inspector_process.pid), shell=True)
        else:
            server_process.terminate()
            inspector_process.terminate()

if __name__ == "__main__":
    run_server() 