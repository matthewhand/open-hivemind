with open('netlify.toml', 'r') as f:
    content = f.read()

content = content.replace('publish = "dist/client"', 'publish = "src/client/dist"')

with open('netlify.toml', 'w') as f:
    f.write(content)
