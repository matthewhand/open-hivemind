import os
import glob
import re

def fix_workflow_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    # Step 1: Update node setup to cache pnpm instead of npm
    content = re.sub(r"cache:\s*['\"]?npm['\"]?", "cache: 'pnpm'", content)

    # Step 2: Inject pnpm action-setup right before setup-node
    setup_pnpm = """      - name: Setup pnpm
        uses: pnpm/action-setup@v4
        with:
          version: 9
"""

    # We want to replace the setup-node action with setup-pnpm AND setup-node
    # But only if it's not already there. Let's do it simply by regexing `uses: actions/setup-node`
    # and ensuring we only prepend it if not already present.
    lines = content.split('\n')
    new_lines = []
    i = 0
    while i < len(lines):
        line = lines[i]

        # Check if line is the setup-node action
        if 'uses: actions/setup-node@' in line and '- name: Setup pnpm' not in ''.join(new_lines[-5:]):
            indent = line[:line.find('uses:')]
            # Add pnpm setup before the setup-node block if it isn't preceded by it
            new_lines.append(f"{indent}- name: Setup pnpm")
            new_lines.append(f"{indent}  uses: pnpm/action-setup@v4")
            new_lines.append(f"{indent}  with:")
            new_lines.append(f"{indent}    version: 9")
            new_lines.append(line)
        elif 'npm ci' in line:
            new_lines.append(line.replace('npm ci', 'pnpm install --frozen-lockfile'))
        elif 'npm install' in line:
            new_lines.append(line.replace('npm install', 'pnpm install'))
        elif 'npm run' in line:
            new_lines.append(line.replace('npm run', 'pnpm run'))
        elif 'npm test' in line:
            new_lines.append(line.replace('npm test', 'pnpm test'))
        elif 'npm audit' in line:
            new_lines.append(line.replace('npm audit', 'pnpm audit'))
        else:
            new_lines.append(line)
        i += 1

    with open(filepath, 'w') as f:
        f.write('\n'.join(new_lines))

for file in glob.glob('.github/workflows/*.yml'):
    print(f"Fixing {file}")
    fix_workflow_file(file)
