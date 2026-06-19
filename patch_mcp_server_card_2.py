import re

with open("src/client/src/pages/MCPServersPage/MCPServerCard.tsx", "r") as f:
    content = f.read()

# Fix URL
content = re.sub(r'<p className="truncate" title={server.url}>\s*<strong>(.*?)</strong>\s*(.*?)\s*</p>',
                 r'<div className="flex gap-1 truncate" title={server.url}>\n              <dt className="font-semibold">\1</dt>\n              <dd>\2</dd>\n            </div>', content)

with open("src/client/src/pages/MCPServersPage/MCPServerCard.tsx", "w") as f:
    f.write(content)
