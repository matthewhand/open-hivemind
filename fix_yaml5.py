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
            # Replace 'uses:' with '- name: Setup pnpm' and use the same indent for uses
            # Actually, `uses:` is at the same level as `- name:`

            # Wait, `uses:` might be a step by itself e.g., `- uses: actions/setup-node`
            # or it might be under a `- name:`

            if line.lstrip().startswith('- uses:'):
                indent = line[:len(line) - len(line.lstrip())]
                new_lines.append(f"{indent}- name: Setup pnpm")
                new_lines.append(f"{indent}  uses: pnpm/action-setup@v4")
                new_lines.append(f"{indent}  with:")
                new_lines.append(f"{indent}    version: 9")
                new_lines.append(line)
            else:
                # It's like `  uses:`
                list_indent = indent[:-2] # Assumes '- name:' was 2 spaces out
                new_lines.append(f"{list_indent}- name: Setup pnpm")
                new_lines.append(f"{list_indent}  uses: pnpm/action-setup@v4")
                new_lines.append(f"{list_indent}  with:")
                new_lines.append(f"{list_indent}    version: 9")
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
