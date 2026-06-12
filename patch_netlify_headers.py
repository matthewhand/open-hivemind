import re

with open("netlify.toml", "r") as f:
    content = f.read()

# Remove interest-cohort=() from Permissions-Policy
content = content.replace("interest-cohort=()", "")
# clean up any trailing comma and space if left over
content = content.replace(", \"", "\"")

with open("netlify.toml", "w") as f:
    f.write(content)
