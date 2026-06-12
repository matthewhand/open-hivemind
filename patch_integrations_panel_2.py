import re

with open("src/client/src/components/IntegrationsPanel.tsx", "r") as f:
    content = f.read()

# I see ListRow already renders an <li> and List renders a <ul>.
# So no need to wrap ListRow. The empty state was already fixed.
# I will just check what other things might need fixing in this file according to "No custom LLM profiles empty state".

# Let's fix the provider empty state as well just in case.
content = content.replace('<div className="col-span-full text-center py-2">', '<section aria-labelledby="default-llm-empty-state" className="col-span-full text-center py-2">\n                  <h3 id="default-llm-empty-state" className="sr-only">No Default LLMs</h3>')
content = content.replace('                  <p className="opacity-50 text-sm">No default models mapped.</p>\n                </div>', '                  <p className="opacity-50 text-sm">No default models mapped.</p>\n                </section>')

with open("src/client/src/components/IntegrationsPanel.tsx", "w") as f:
    f.write(content)
