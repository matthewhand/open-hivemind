import re

with open('src/client/src/components/DaisyUI/DashboardWidgetSystem.tsx', 'r') as f:
    content = f.read()

# Replace div elements with role="button" and tabIndex={0} with proper button elements
# There are several instances that look like this:
# <div tabIndex={0} role="button" className="btn btn-ghost btn-sm btn-circle" aria-label="Widget options">⋮</div>
# <ul tabIndex={0} className="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-52">
# We want to change the div to a button and add aria-haspopup="menu" to it.
# Note: Since it's a dropdown, DaisyUI handles the toggle via CSS focus, so using button tabIndex={0} is fine, or we can just change the tag.

pattern_div = r'<div tabIndex=\{0\} role="button" className="([^"]+)" aria-label="([^"]+)">⋮</div>'
replacement_div = r'<button type="button" aria-haspopup="menu" aria-expanded="false" className="\1" aria-label="\2">⋮</button>'

# Note: The DaisyUI dropdown pattern uses tabIndex=0 on the trigger for CSS-only dropdowns.
# A button natively receives focus, but since DaisyUI relies on the :focus pseudo-class,
# we'll keep the structure similar but use a <button> with semantic attributes.
# Actually, for standard dropdowns in DaisyUI, they often use a <div> or <label> tabIndex={0} because clicking a button might not keep focus.
# Let's see if we can just change it to a button type="button" tabIndex={0}.
# Or wait, Button is natively focusable.

content = re.sub(
    r'<div tabIndex=\{0\} role="button" className="btn btn-ghost btn-sm btn-circle" aria-label="Widget options">⋮</div>',
    r'<button type="button" tabIndex={0} aria-haspopup="menu" aria-expanded="false" className="btn btn-ghost btn-sm btn-circle" aria-label="Widget options">⋮</button>',
    content
)

# Also let's give the ul role="menu"
content = content.replace(
    '<ul tabIndex={0} className="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-52">',
    '<ul tabIndex={0} role="menu" aria-label="Widget actions" className="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-52">'
)

with open('src/client/src/components/DaisyUI/DashboardWidgetSystem.tsx', 'w') as f:
    f.write(content)
