with open('netlify.toml', 'r') as f:
    lines = f.readlines()

new_lines = []
in_dup_redirects = False
seen_redirects = False

for line in lines:
    stripped = line.strip()
    if stripped == '[[redirects]]':
        # Let's just keep all redirects, TOML allows multiple [[redirects]] as it's an array of tables
        pass

    # Check for duplicate [build] again just in case
    # Actually wait, let's look at the actual error first!
