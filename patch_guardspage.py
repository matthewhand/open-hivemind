import re

with open('src/client/src/pages/GuardsPage.tsx', 'r') as f:
    content = f.read()

# Fix React crash
content = content.replace('icon={Shield}', 'icon={<Shield className="w-8 h-8" />}')

with open('src/client/src/pages/GuardsPage.tsx', 'w') as f:
    f.write(content)
