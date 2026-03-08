import re

try:
    with open('netlify.toml', 'r') as f:
        content = f.read()

    # Look for duplicate blocks
    blocks = {}
    lines = content.split('\n')
    new_lines = []

    current_block = None

    for line in lines:
        stripped = line.strip()
        if stripped.startswith('[') and stripped.endswith(']'):
            block_name = stripped
            if block_name in blocks and block_name != '[[redirects]]' and block_name != '[[headers]]':
                print(f"Found duplicate block: {block_name}")
                current_block = "DUPLICATE"
                continue
            else:
                blocks[block_name] = True
                current_block = block_name
                new_lines.append(line)
        elif current_block == "DUPLICATE":
            continue
        else:
            new_lines.append(line)

    print("\n".join(new_lines))
except Exception as e:
    print(f"Error: {e}")
