import re

with open("src/client/src/components/IntegrationsPanel.tsx", "r") as f:
    content = f.read()

# Fix mismatched closing tag from my previous script
content = content.replace('                  </Button>\n                </div>', '                  </Button>\n                </section>')


with open("src/client/src/components/IntegrationsPanel.tsx", "w") as f:
    f.write(content)
