import re

with open("src/client/src/components/IntegrationsPanel.tsx", "r") as f:
    content = f.read()

# Fix aria-labels string casting
content = content.replace("aria-label={`Edit ${profile.name} provider`}", "aria-label={String(`Edit ${profile.name} provider`)}")
content = content.replace("aria-label={`Delete ${profile.name} provider`}", "aria-label={String(`Delete ${profile.name} provider`)}")
content = content.replace("aria-label={`Edit ${key} configuration`}", "aria-label={String(`Edit ${key} configuration`)}")

with open("src/client/src/components/IntegrationsPanel.tsx", "w") as f:
    f.write(content)
