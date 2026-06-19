import re

with open("src/client/src/pages/MCPServersPage/MCPServerCard.tsx", "r") as f:
    content = f.read()

# Make the details section semantic dl
content = content.replace('<div className="text-sm space-y-1 mb-4 bg-base-200/50 p-3 rounded-lg">', '<dl className="text-sm space-y-1 mb-4 bg-base-200/50 p-3 rounded-lg">')
content = content.replace('</div>\n        <Card.Actions', '</dl>\n        <Card.Actions')

# Transform paragraphs into dt/dd
# p containing strong:
# <p><strong>Status:</strong> {server.status}</p> -> <div className="flex gap-1"><dt className="font-semibold">Status:</dt> <dd>{server.status}</dd></div>
content = re.sub(r'<p>\s*<strong>(.*?)</strong>\s*(.*?)\s*</p>',
                 r'<div className="flex gap-1">\n              <dt className="font-semibold">\1</dt>\n              <dd>\2</dd>\n            </div>', content)

# p with class:
# <p className="text-base-content/50 text-xs">Last connected: {new Date(server.lastConnected).toLocaleDateString()}</p> -> <div className="flex gap-1 text-base-content/50 text-xs"><dt className="font-semibold">Last connected:</dt> <dd>{new Date(server.lastConnected).toLocaleDateString()}</dd></div>
content = re.sub(r'<p className="text-base-content/50 text-xs">\s*Last connected:\s*(.*?)\s*</p>',
                 r'<div className="flex gap-1 text-base-content/50 text-xs">\n              <dt className="font-semibold">Last connected:</dt>\n              <dd>\1</dd>\n            </div>', content)


# String cast aria-labels
content = content.replace("aria-label={`Select ${server.name}`}", "aria-label={String(`Select ${server.name}`)}")
content = content.replace("aria-label={`Disconnect ${server.name}`}", "aria-label={String(`Disconnect ${server.name}`)}")
content = content.replace("aria-label={\n                    server.status === 'stopped'\n                      ? `Connect ${server.name}`\n                      : `Retry Connection ${server.name}`\n                  }", "aria-label={String(server.status === 'stopped' ? `Connect ${server.name}` : `Retry Connection ${server.name}`)}")
content = content.replace("aria-label={`View Tools for ${server.name}`}", "aria-label={String(`View Tools for ${server.name}`)}")
content = content.replace("aria-label={`Edit ${server.name}`}", "aria-label={String(`Edit ${server.name}`)}")
content = content.replace("aria-label={`Delete ${server.name}`}", "aria-label={String(`Delete ${server.name}`)}")


with open("src/client/src/pages/MCPServersPage/MCPServerCard.tsx", "w") as f:
    f.write(content)
