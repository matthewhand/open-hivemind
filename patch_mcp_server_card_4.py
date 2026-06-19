with open("src/client/src/pages/MCPServersPage/MCPServerCard.tsx", "r") as f:
    lines = f.readlines()

# Line 109 is `        </div>` but it should be `        </dl>` since the `<dl>` started on line 82.
lines[108] = '        </dl>\n'

with open("src/client/src/pages/MCPServersPage/MCPServerCard.tsx", "w") as f:
    f.writelines(lines)
