import re

try:
    with open('netlify.toml', 'r') as f:
        content = f.read()

    lines = content.split('\n')
    new_lines = []

    seen_build = False

    for i, line in enumerate(lines):
        if line.strip() == '[build]':
            if seen_build:
                # We found a duplicate [build] section, skip it and its contents until the next section
                j = i + 1
                while j < len(lines) and not lines[j].strip().startswith('['):
                    j += 1
                # Skip to j
                continue
            else:
                seen_build = True
                new_lines.append(line)
        else:
            new_lines.append(line)

    # Also need to make sure we didn't add the lines from the duplicate section

    print("\n".join(new_lines))
except Exception as e:
    print(f"Error: {e}")
