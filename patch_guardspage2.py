with open('src/client/src/pages/GuardsPage.tsx', 'r') as f:
    content = f.read()

# Revert EmptyState icon to Shield reference since EmptyState expects a reference!
content = content.replace('icon={<Shield className="w-8 h-8" />}', 'icon={Shield}')

# But PageHeader needs the instantiation, so let's put it back for PageHeader
content = content.replace('''<PageHeader
        title="Guard Profiles"
        description="Manage security and access control profiles for bots"
        icon={Shield}''', '''<PageHeader
        title="Guard Profiles"
        description="Manage security and access control profiles for bots"
        icon={<Shield className="w-8 h-8" />}''')

with open('src/client/src/pages/GuardsPage.tsx', 'w') as f:
    f.write(content)
