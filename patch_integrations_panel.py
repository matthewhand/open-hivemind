import re

with open("src/client/src/components/IntegrationsPanel.tsx", "r") as f:
    content = f.read()

# Fix LLM Empty State
content = content.replace('<div className="text-center py-8 opacity-50 border-2 border-dashed border-base-200 rounded-xl mb-6">', '<section aria-labelledby="llm-empty-state" className="text-center py-8 opacity-50 border-2 border-dashed border-base-200 rounded-xl mb-6">\n            <h3 id="llm-empty-state" className="sr-only">No LLM Profiles</h3>')
content = content.replace('            <p>No custom LLM profiles configured. Using defaults.</p>\n          </div>', '            <p>No custom LLM profiles configured. Using defaults.</p>\n          </section>')

# Wrapping ListRow with li
# It's inside a Map, let's target the map return correctly
# return (
#   <ListRow key={profile.key} className="hover:bg-base-200/30 transition-colors p-4 border-b border-base-200 last:border-b-0">
# Wait, let's see how it looks:
