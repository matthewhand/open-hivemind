try:
    with open('netlify.toml', 'r') as f:
        content = f.read()

    lines = content.split('\n')
    new_lines = []

    seen_build = False

    for i, line in enumerate(lines):
        if line.strip() == '[build]':
            if seen_build:
                pass # skip
            else:
                seen_build = True
                new_lines.append(line)
        elif seen_build and line.strip() == '[build]':
            pass
        elif line.strip() == 'command = "npm run build"':
             if new_lines.count(line) == 0:
                 new_lines.append(line)
        elif line.strip() == 'publish = "src/client/dist"':
             if new_lines.count(line) == 0:
                 new_lines.append(line)
        else:
             if "publish" not in line and "command" not in line or line.strip().startswith("#"):
                 new_lines.append(line)

    print("\n".join(new_lines))
except Exception as e:
    print(f"Error: {e}")
