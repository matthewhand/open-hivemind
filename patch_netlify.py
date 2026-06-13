with open('netlify.toml', 'r') as f:
    content = f.read()

content = content.replace('publish = "src/client/dist"', 'publish = "dist/client"')

with open('netlify.toml', 'w') as f:
    f.write(content)
