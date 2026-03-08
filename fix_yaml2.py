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
            indent = line[:line.find('uses:')]
            # Add pnpm setup before the setup-node block if it isn't preceded by it
            # Remove previous bad injected lines first if they exist
            # Actually, I'll just check if we have bad injections.
            new_lines.append(f"{indent}- name: Setup pnpm")
            new_lines.append(f"{indent}  uses: pnpm/action-setup@v4")
            new_lines.append(f"{indent}  with:")
            new_lines.append(f"{indent}    version: 9")
            new_lines.append(line)
        elif '- name: Setup pnpm' in line or 'uses: pnpm/action-setup' in line or 'version: 9' in line and '- name: Setup pnpm' in ''.join(new_lines[-4:]):
            # Skip the bad injections or existing ones, we'll re-add them correctly above.
            pass
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
