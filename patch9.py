import re

with open('src/client/src/components/ProviderConfiguration/ProviderConfigModal.tsx', 'r') as f:
    content = f.read()

pattern = r"}; => handleFieldChange\(field\.name, e\.target\.value\)}.*"

content = re.sub(pattern, "};\n\nexport default ProviderConfigModal;\n", content, flags=re.DOTALL)

with open('src/client/src/components/ProviderConfiguration/ProviderConfigModal.tsx', 'w') as f:
    f.write(content)
