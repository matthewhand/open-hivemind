import re

with open('netlify.toml', 'r') as f:
    content = f.read()

# We need to find and remove duplicate sections or keys
# Instead of doing it in python, let's just see what the error is first.
