with open("scripts/build-netlify.sh") as f:
  c = f.read()

c = c.replace("npm run build:backend", "pnpm run build:backend")
c = c.replace("npm run build:frontend", "pnpm run build:frontend")
c = c.replace("""# Use npx tsc to compile the specific file
npx tsc src/netlify/functions/server.ts \\
  --outDir dist/netlify/functions \\
  --target es2018 \\
  --module commonjs \\
  --esModuleInterop \\
  --allowSyntheticDefaultImports \\
  --skipLibCheck \\
  --moduleResolution node""", """# Bundle server.ts with esbuild for Netlify
npx --yes esbuild src/netlify/functions/server.ts \\
  --bundle \\
  --platform=node \\
  --target=node20 \\
  --outfile=dist/netlify/functions/server.js \\
  --external:express \\
  --external:cors \\
  --external:serverless-http \\
  --external:sqlite3 \\
  --external:better-sqlite3 \\
  --external:mock-aws-s3 \\
  --external:nock \\
  --external:aws-sdk""")

with open("scripts/build-netlify.sh", "w") as f:
  f.write(c)
