import re

with open('src/client/src/components/ProviderConfigForm.tsx', 'r') as f:
    content = f.read()

# Fix loading={fetchState === 'testing'} on Load Avatar to be loadingAvatar
content = content.replace(
"""          <Button
            variant="secondary"
            onClick={handleLoadAvatar}
            loading={fetchState === 'testing'}
            disabled={fetchState !== 'idle'}
          >
            Load Avatar""",
"""          <Button
            variant="secondary"
            onClick={handleLoadAvatar}
            loading={fetchState === 'loadingAvatar'}
            disabled={fetchState !== 'idle'}
          >
            Load Avatar"""
)

with open('src/client/src/components/ProviderConfigForm.tsx', 'w') as f:
    f.write(content)
