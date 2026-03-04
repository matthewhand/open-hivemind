const fs = require('fs');
let content = fs.readFileSync('src/client/src/components/SearchFilterBar.tsx', 'utf8');

// 1. Add CHIP_EXIT_DURATION_MS
content = content.replace(
  "export const SearchFilterBar: React.FC<SearchFilterBarProps> = ({",
  "const CHIP_EXIT_DURATION_MS = 200;\n\nexport const SearchFilterBar: React.FC<SearchFilterBarProps> = ({"
);

// Update timeout
content = content.replace(
  "}, 200); // Wait for exit animation",
  "}, CHIP_EXIT_DURATION_MS); // Wait for exit animation"
);

// 2. Active filter count calculation
const countCode = `
  const activeFilters = filters.filter((f) => f.value && f.value !== 'all' && f.value !== '');
  const activeFilterCount = activeFilters.length;
`;
content = content.replace(
  "const [removingFilter, setRemovingFilter] = React.useState<string | null>(null);",
  "const [removingFilter, setRemovingFilter] = React.useState<string | null>(null);\n" + countCode
);

// 3. Add badge to the search input prefix area
// The prefix is currently: prefix={<Search className="w-4 h-4 text-base-content/50" />}
// Let's replace it to include the badge if activeFilterCount > 0
const originalPrefix = `prefix={<Search className="w-4 h-4 text-base-content/50" />}`;
const newPrefix = `prefix={
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-base-content/50" />
              {activeFilterCount > 0 && (
                <span className="badge badge-primary badge-xs">
                  {activeFilterCount} active
                </span>
              )}
            </div>
          }`;
content = content.replace(originalPrefix, newPrefix);

// 4. Update the mapping to use activeFilters
content = content.replace(
  "          {filters\n            .filter((f) => f.value && f.value !== 'all' && f.value !== '')\n            .map((filter) => {",
  "          {activeFilters.map((filter) => {"
);

// 5. Add keyboard accessibility to the chip itself or ensure button is focusable
// The button already has onClick, aria-label, and disabled. It is a native <button>, so it is focusable.
// But the comment specifically says: "but the chip container itself is not a focusable/interactive target. Each chip should be reachable via Tab and clearable via Enter/Space."
// Oh, the reviewer wants the *container* or the button to handle it?
// "The clear (X) button on each chip should support keyboard navigation. Currently, the disabled={isRemoving} attribute prevents interaction during the fade-out animation, but the chip container itself is not a focusable/interactive target. Each chip should be reachable via Tab and clearable via Enter/Space."
// I will add tabIndex={0} to the chip container and onKeyDown handler, or just ensure the button is properly accessible. Actually, the button is already tabable because it's a <button>. But I will add onKeyDown to the chip itself if they want the *chip* to be reachable.
// Wait, "Each chip should be reachable via Tab".
const originalChipDiv = `                <div
                  key={filter.key}
                  className={\`
                    inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium
                    bg-primary/10 text-primary border border-primary/20
                    transition-all duration-200 ease-in-out transform origin-left
                    \${isRemoving ? 'opacity-0 scale-50 -ml-4 whitespace-nowrap' : 'opacity-100 scale-100'}
                  \`}
                >`;

const newChipDiv = `                <div
                  key={filter.key}
                  tabIndex={0}
                  role="button"
                  aria-label={\`Active filter: \${filter.key} \${label}. Press Enter or Space to clear.\`}
                  onKeyDown={(e) => {
                    if ((e.key === 'Enter' || e.key === ' ') && !isRemoving) {
                      e.preventDefault();
                      handleClearFilter(filter);
                    }
                  }}
                  className={\`
                    inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium
                    bg-primary/10 text-primary border border-primary/20
                    transition-all duration-\${CHIP_EXIT_DURATION_MS} ease-in-out transform origin-left focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 focus:ring-offset-base-100
                    \${isRemoving ? 'opacity-0 scale-50 -ml-4 whitespace-nowrap pointer-events-none' : 'opacity-100 scale-100 cursor-pointer hover:bg-primary/20'}
                  \`}
                  onClick={() => !isRemoving && handleClearFilter(filter)}
                >`;

content = content.replace(originalChipDiv, newChipDiv);

// Since the chip itself is now the button, we can either make the 'X' button `tabIndex={-1}` or remove it and just use the icon. The reviewer said "The clear (X) button on each chip should support keyboard navigation... Each chip should be reachable via Tab". Let's make the chip the focusable target, and the 'X' icon just part of it.
const originalXBtn = `                  <button
                    onClick={() => handleClearFilter(filter)}
                    className="hover:bg-primary/20 rounded-full p-0.5 ml-1 transition-colors"
                    aria-label={\`Remove \${filter.key} filter\`}
                    disabled={isRemoving}
                  >
                    <X className="w-3 h-3" />
                  </button>`;
const newXBtn = `                  <div className="rounded-full p-0.5 ml-1 transition-colors group-hover:bg-primary/30">
                    <X className="w-3 h-3 pointer-events-none" />
                  </div>`;
content = content.replace(originalXBtn, newXBtn);

fs.writeFileSync('src/client/src/components/SearchFilterBar.tsx', content);
