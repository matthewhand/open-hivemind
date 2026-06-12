import re

with open("src/client/src/pages/MCPServersPage/MCPServerCard.tsx", "r") as f:
    content = f.read()

# Fix the closing tag mismatch
# We have a <dl> block, but it looks like we accidentally replaced a </div> with </dl> but the original file had a matching </div> for some inner div perhaps.
# Let's check the original content again. The original had:
# <div className="text-sm space-y-1 mb-4 bg-base-200/50 p-3 rounded-lg">
#   ...
#   </div>
#   ... (lastConnected)
# </div>
# Wait, actually, let's just make it </dl> instead of </div> for the outer tag, and ensure all inner tags are balanced.
# Ah, looking at the esbuild error:
# Unexpected closing "div" tag does not match opening "dl" tag
# 107 |              </div>
# 108 |            )}
# 109 |          </div>
# Let's see lines 105-112.
