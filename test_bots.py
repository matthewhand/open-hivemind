import subprocess
try:
    res = subprocess.run(["npx", "tsc", "-p", "src/client/tsconfig.app.json"], capture_output=True, text=True)
    if res.returncode == 0:
        print("Success")
    else:
        print("Error:")
        print(res.stdout)
except Exception as e:
    print(e)
