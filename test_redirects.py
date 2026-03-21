with open("scripts/build-netlify.sh", "a") as f:
  f.write("""

# 5.5 Write explicit redirects file (just in case netlify.toml is ignored)
echo "🔹 Writing explicit _redirects..."
cat << 'EOF2' > dist/client/_redirects
/api/*  /.netlify/functions/server  200!
/*  /index.html  200
EOF2

""")
