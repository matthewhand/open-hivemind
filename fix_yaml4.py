import os
import glob
import re

def fix_workflow_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    lines = content.split('\n')
    new_lines = []

    i = 0
    while i < len(lines):
        line = lines[i]

        # Check if line is the setup-node action
        if 'uses: actions/setup-node@' in line:
            indent = line[:len(line) - len(line.lstrip())]
            # Add pnpm setup before the setup-node block
            new_lines.append(f"{indent}- name: Setup pnpm")
            new_lines.append(f"{indent}  uses: pnpm/action-setup@v4")
            new_lines.append(f"{indent}  with:")
            new_lines.append(f"{indent}    version: 9")
            new_lines.append(line)
        elif 'npm ci' in line:
            new_lines.append(line.replace('npm ci', 'pnpm install --frozen-lockfile'))
        elif 'npm install' in line and 'pnpm' not in line:
            new_lines.append(line.replace('npm install', 'pnpm install'))
        elif 'npm run' in line and 'pnpm' not in line:
            new_lines.append(line.replace('npm run', 'pnpm run'))
        elif 'npm test' in line and 'pnpm' not in line:
            new_lines.append(line.replace('npm test', 'pnpm test'))
        elif 'npm audit' in line and 'pnpm' not in line:
            new_lines.append(line.replace('npm audit', 'pnpm audit'))
        else:
            new_lines.append(line)
        i += 1

    # fix cache: npm to cache: pnpm
    content = '\n'.join(new_lines)
    content = re.sub(r"cache:\s*['\"]?npm['\"]?", "cache: 'pnpm'", content)

    with open(filepath, 'w') as f:
        f.write(content)

for file in glob.glob('.github/workflows/*.yml'):
    print(f"Fixing {file}")
    fix_workflow_file(file)
