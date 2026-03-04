const fs = require('fs');
const filepath = 'src/client/src/components/SearchFilterBar.tsx';
let content = fs.readFileSync(filepath, 'utf8');

// We want to add ActiveFilter Chips right below the main div, or inside it if flex-col.
// The component returns a div container. Let's wrap it in a Fragment, and put the chips below.

const searchString = `    </div>
  );
};`;

const replacementString = `    </div>

      {/* Active Filter Chips */}
      {filters.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-3 empty:hidden">
          {filters
            .filter((f) => f.value && f.value !== 'all' && f.value !== '')
            .map((filter) => {
              const selectedOption = filter.options.find((o) => o.value === filter.value);
              const label = selectedOption ? selectedOption.label : filter.value;
              const isRemoving = removingFilter === filter.key;

              return (
                <div
                  key={filter.key}
                  className={\`
                    inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium
                    bg-primary/10 text-primary border border-primary/20
                    transition-all duration-200 ease-in-out transform origin-left
                    \${isRemoving ? 'opacity-0 scale-50 -ml-4 whitespace-nowrap' : 'opacity-100 scale-100'}
                  \`}
                >
                  <span className="opacity-70 capitalize">{filter.key}:</span>
                  <span>{label}</span>
                  <button
                    onClick={() => handleClearFilter(filter)}
                    className="hover:bg-primary/20 rounded-full p-0.5 ml-1 transition-colors"
                    aria-label={\`Remove \${filter.key} filter\`}
                    disabled={isRemoving}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
};`;

// We also need to add state for removingFilter and the handleClearFilter method.
const hookSearchString = `export const SearchFilterBar: React.FC<SearchFilterBarProps> = ({
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Search...',
  filters = [],
  className = '',
  onClear,
  children
}) => {
  const handleClearSearch = () => {`;

const hookReplacementString = `export const SearchFilterBar: React.FC<SearchFilterBarProps> = ({
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Search...',
  filters = [],
  className = '',
  onClear,
  children
}) => {
  const [removingFilter, setRemovingFilter] = React.useState<string | null>(null);

  const handleClearFilter = (filter: FilterConfig) => {
    setRemovingFilter(filter.key);
    setTimeout(() => {
      const defaultOption = filter.options.find((o) => o.value === 'all' || o.value === '');
      filter.onChange(defaultOption ? (defaultOption.value as string) : '');
      setRemovingFilter(null);
    }, 200); // Wait for exit animation
  };

  const handleClearSearch = () => {`;

content = content.replace(searchString, replacementString).replace(hookSearchString, hookReplacementString);

// Fix the outer container return
const finalReturnSearch = `  return (
    <div className={\`flex flex-col sm:flex-row gap-4 justify-between items-center bg-base-100 p-4 rounded-lg shadow-sm border border-base-200 \${className}\`}>`;
const finalReturnReplace = `  return (
    <div className="flex flex-col w-full">
      <div className={\`flex flex-col sm:flex-row gap-4 justify-between items-center bg-base-100 p-4 rounded-lg shadow-sm border border-base-200 \${className}\`}>`;

content = content.replace(finalReturnSearch, finalReturnReplace);

fs.writeFileSync(filepath, content);
