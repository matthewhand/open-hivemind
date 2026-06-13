import re

with open('src/client/src/components/ProviderConfigForm.tsx', 'r') as f:
    content = f.read()

# Replace the single boolean with a state machine
content = content.replace(
    'const [isLoading, setIsLoading] = useState(false);',
    "const [fetchState, setFetchState] = useState<'idle' | 'testing' | 'loadingAvatar'>('idle');"
)

# Update handleTestConnection
content = content.replace(
    'setIsLoading(true);\n    setTestResult(null);',
    "setFetchState('testing');\n    setTestResult(null);"
)

# Update finally block inside handleTestConnection
content = content.replace(
    'setIsLoading(false);\n        setAbortController(null);',
    "setFetchState('idle');\n        setAbortController(null);"
)

# Update handleCancelTest
content = content.replace(
    'setIsLoading(false);\n      setTestResult({',
    "setFetchState('idle');\n      setTestResult({"
)

# Update handleLoadAvatar
content = content.replace(
    'setIsLoading(true);\n    setAvatarUrl(null);',
    "setFetchState('loadingAvatar');\n    setAvatarUrl(null);"
)
content = content.replace(
    '    } finally {\n      setIsLoading(false);\n    }',
    "    } finally {\n      setFetchState('idle');\n    }"
)

# Now update the UI to use the state machine correctly
# In the Action Buttons section
content = content.replace(
    'loading={isLoading && !abortController}',
    "loading={fetchState === 'testing'}"
)
content = content.replace(
    'disabled={isLoading && !abortController}',
    "disabled={fetchState !== 'idle'}"
)

content = content.replace(
    'loading={isLoading && !abortController}',
    "loading={fetchState === 'loadingAvatar'}"
)
content = content.replace(
    'disabled={isLoading && !abortController}',
    "disabled={fetchState !== 'idle'}"
)

# Handle the abort controller button conditional
content = content.replace(
    '{isLoading && abortController && (',
    "{fetchState === 'testing' && abortController && ("
)

# Also wrap the action buttons in a div with aria-busy
# First find the buttons container
container_start = '<div className="flex flex-wrap gap-3 pt-4 border-t">'
container_replacement = '<div className="flex flex-wrap gap-3 pt-4 border-t" aria-busy={fetchState !== \'idle\'} aria-live="polite">'

content = content.replace(container_start, container_replacement)

with open('src/client/src/components/ProviderConfigForm.tsx', 'w') as f:
    f.write(content)
