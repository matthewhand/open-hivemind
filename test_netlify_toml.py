with open("netlify.toml") as f:
  c = f.read()

if "node_bundler" not in c:
  with open("netlify.toml", "w") as f:
    c = c.replace("[[redirects]]", "[functions]\n  node_bundler = \"esbuild\"\n\n[[redirects]]", 1)
    f.write(c)
