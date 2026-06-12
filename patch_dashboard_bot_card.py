import re

with open("src/client/src/components/DashboardBotCard.tsx", "r") as f:
    content = f.read()

# Replace Provider Badges Div with UL
content = content.replace('<div className="flex flex-wrap gap-1.5 mt-3">', '<ul className="flex flex-wrap gap-1.5 mt-3" aria-label="Bot Providers">')
content = content.replace('        </div>\n\n        {/* Error alert', '        </ul>\n\n        {/* Error alert')

# Specifically target the badges in the UL block
parts = content.split('<ul className="flex flex-wrap gap-1.5 mt-3" aria-label="Bot Providers">')
before = parts[0]
after = parts[1]

after_parts = after.split('        </ul>\n\n        {/* Error alert')
ul_content = after_parts[0]
rest = after_parts[1]

ul_content = re.sub(r'(<Badge[^>]*>.*?</Badge>)', r'<li>\1</li>', ul_content, flags=re.DOTALL)

content = before + '<ul className="flex flex-wrap gap-1.5 mt-3" aria-label="Bot Providers">' + ul_content + '        </ul>\n\n        {/* Error alert' + rest

# String cast aria-labels
content = content.replace("aria-label={`Run performance benchmark for ${bot.name}`}", "aria-label={String(`Run performance benchmark for ${bot.name}`)}")
content = content.replace("aria-label={`View version history for ${bot.name}`}", "aria-label={String(`View version history for ${bot.name}`)}")
content = content.replace("aria-label={`View AI performance insights for ${bot.name}`}", "aria-label={String(`View AI performance insights for ${bot.name}`)}")
content = content.replace("aria-label={`Run diagnostic for ${bot.name}`}", "aria-label={String(`Run diagnostic for ${bot.name}`)}")
content = content.replace("aria-label={`View details for ${bot.name}`}", "aria-label={String(`View details for ${bot.name}`)}")

with open("src/client/src/components/DashboardBotCard.tsx", "w") as f:
    f.write(content)
