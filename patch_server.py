with open("src/server/server.ts", "r") as f:
    content = f.read()

content = content.replace("  // app.get('/health', (_req, res) => {\n  //   res.redirect('/api/health');\n  // });", "")

with open("src/server/server.ts", "w") as f:
    f.write(content)
