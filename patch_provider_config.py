import re

with open('src/client/src/components/ProviderConfigForm.tsx', 'r') as f:
    content = f.read()

# Replace states:
# const [isLoading, setIsLoading] = useState(false);
# const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
# With a state machine pattern

state_machine_setup = """  const [fetchState, setFetchState] = useState<'idle' | 'testing' | 'loadingAvatar' | 'saving'>('idle');
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);"""

content = re.sub(
    r'  const \[isLoading, setIsLoading\] = useState\(false\);\n  const \[testResult, setTestResult\] = useState<\{ success: boolean; message: string \} \| null>\(null\);',
    state_machine_setup,
    content
)

# Update handleTestConnection
# setIsLoading(true); -> setFetchState('testing');
# setIsLoading(false); -> setFetchState('idle');
content = content.replace(
    'setIsLoading(true);',
    "setFetchState(prev => prev === 'idle' ? 'testing' : prev);"
)

# Replace all other instances of setIsLoading(false); inside handleTestConnection and other functions
# We need to be careful. Let's just do a generic replace.
content = content.replace(
    'setIsLoading(false);',
    "setFetchState('idle');"
)

# Fix Avatar loading
content = content.replace(
    "setFetchState(prev => prev === 'idle' ? 'testing' : prev);",
    "setFetchState('testing');",
    1 # We only want to do this carefully. Wait, let's just use regex.
)

with open('src/client/src/components/ProviderConfigForm.tsx', 'w') as f:
    f.write(content)
