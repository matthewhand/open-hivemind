with open('scripts/build-netlify.sh', 'r') as f:
    lines = f.readlines()

with open('scripts/build-netlify.sh', 'w') as f:
    for line in lines:
        if 'mkdir -p dist/client' in line or 'cp -r src/client/dist/* dist/client/' in line or 'Copying to final directory to match netlify.toml' in line:
            continue
        f.write(line)
