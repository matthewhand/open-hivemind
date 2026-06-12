import re

with open("src/client/src/components/BotStatusCard.tsx", "r") as f:
    content = f.read()

# Fix the broken tags
content = content.replace('<dt className="text-sm font-semibold min-w-[120px]">Status:</span>', '<dt className="text-sm font-semibold min-w-[120px]">Status:</dt>')

# Let's see if there are other broken ones
content = re.sub(r'<span className="(.*?)">(.*?)</dt>', r'<dt className="\1">\2</dt>', content)
content = re.sub(r'<dt className="(.*?)">(.*?)</span>', r'<dt className="\1">\2</dt>', content)
content = re.sub(r'<dd className="(.*?)">(.*?)</span>', r'<dd className="\1">\2</dd>', content)
content = re.sub(r'<span className="(.*?)">(.*?)</dd>', r'<dd className="\1">\2</dd>', content)


with open("src/client/src/components/BotStatusCard.tsx", "w") as f:
    f.write(content)
