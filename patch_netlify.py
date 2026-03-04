with open('netlify.toml', 'r') as f:
    lines = f.readlines()

with open('netlify.toml', 'w') as f:
    for i, line in enumerate(lines):
        if 'ignore = "test \\"$BRANCH\\" != \\"main\\""' in line and i == 4:
            continue
        f.write(line)
print("netlify.toml patched.")
