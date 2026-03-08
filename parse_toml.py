import toml

try:
    with open('netlify.toml', 'r') as f:
        toml.load(f)
    print("Valid TOML")
except Exception as e:
    print(f"Error: {e}")
