import re

with open("src/client/src/components/BotStatusCard.tsx", "r") as f:
    content = f.read()

# Replace div wrappers for sections with dl
content = content.replace('<div className="space-y-3">', '<dl className="space-y-3">')
content = content.replace('</div>\n      ),', '</dl>\n      ),')

# Basic info replace
content = re.sub(r'<div className="flex gap-4">\s*<span className="text-sm font-semibold min-w-\[120px\]">(.*?)</span>\s*<span className="text-sm">(.*?)</span>\s*</div>',
                 r'<div className="flex gap-4">\n            <dt className="text-sm font-semibold min-w-[120px]">\1</dt>\n            <dd className="text-sm">\2</dd>\n          </div>', content)

# Basic info replace 2 (Persona)
content = re.sub(r'<div className="flex gap-4">\s*<span className="text-sm font-semibold min-w-\[120px\]">(.*?)</span>\s*<span className="text-sm">(.*?)</span>\s*</div>',
                 r'<div className="flex gap-4">\n              <dt className="text-sm font-semibold min-w-[120px]">\1</dt>\n              <dd className="text-sm">\2</dd>\n            </div>', content)


# Metrics replace
content = re.sub(r'<div className="flex gap-4">\s*<span className="text-sm font-semibold min-w-\[120px\]">(.*?)</span>\s*<span className="text-sm text-error">(.*?)</span>\s*</div>',
                 r'<div className="flex gap-4">\n            <dt className="text-sm font-semibold min-w-[120px]">\1</dt>\n            <dd className="text-sm text-error">\2</dd>\n          </div>', content, flags=re.DOTALL)


# Status Information replace
content = re.sub(r'<div className="flex gap-4">\s*<span className="text-sm font-semibold min-w-\[120px\]">Status:</span>\s*<div className="flex items-center gap-2">\s*(.*?)\s*<span className="text-sm">(.*?)</span>\s*</div>\s*</div>',
                 r'<div className="flex gap-4">\n            <dt className="text-sm font-semibold min-w-[120px]">Status:</dt>\n            <dd className="flex items-center gap-2">\n              \1\n              <span className="text-sm">\2</span>\n            </dd>\n          </div>', content, flags=re.DOTALL)

content = re.sub(r'<div className="flex gap-4">\s*<span className="text-sm font-semibold min-w-\[120px\]">Connected:</span>\s*<span className="text-sm">(.*?)</span>\s*</div>',
                 r'<div className="flex gap-4">\n            <dt className="text-sm font-semibold min-w-[120px]">Connected:</dt>\n            <dd className="text-sm">\1</dd>\n          </div>', content, flags=re.DOTALL)


# Health details replace
content = re.sub(r'<div key={key} className="flex gap-4">\s*<span className="text-sm font-semibold min-w-\[120px\]">{key}:</span>\s*<span className="text-sm">(.*?)</span>\s*</div>',
                 r'<div key={key} className="flex gap-4">\n              <dt className="text-sm font-semibold min-w-[120px]">{key}:</dt>\n              <dd className="text-sm">\1</dd>\n            </div>', content, flags=re.DOTALL)


# String cast aria-labels
content = content.replace("aria-label={`View details for ${bot.name}`}", "aria-label={String(`View details for ${bot.name}`)}")
content = content.replace("aria-label={`Refresh status for ${bot.name}`}", "aria-label={String(`Refresh status for ${bot.name}`)}")


with open("src/client/src/components/BotStatusCard.tsx", "w") as f:
    f.write(content)
