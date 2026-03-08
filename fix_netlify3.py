with open('netlify.toml', 'r') as f:
    lines = f.readlines()

new_lines = []
in_dup_build = False
seen_build = False

for line in lines:
    stripped = line.strip()
    if stripped == '[build]':
        if seen_build:
            in_dup_build = True
        else:
            seen_build = True
            new_lines.append(line)
    elif stripped.startswith('[') and stripped.endswith(']'):
        in_dup_build = False
        new_lines.append(line)
    elif not in_dup_build:
        new_lines.append(line)

with open('netlify.toml', 'w') as f:
    f.writelines(new_lines)
