const fs = require('fs');

let file = fs.readFileSync('src/client/src/pages/GuardsPage.tsx', 'utf8');

const oldHandleInputChange = `  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;

    if (newValue.includes(',')) {
      const parts = newValue.split(',');
      const lastPart = parts.pop() || '';
      const completedItems = parts.map(s => s.trim()).filter(Boolean);

      const newItems = [...value];
      let hasChanges = false;

      completedItems.forEach(item => {
        if (!newItems.includes(item) && newItems.length < maxItems) {
          newItems.push(item);
          hasChanges = true;
        }
      });

      if (hasChanges) {
        onChange(newItems);
      }
      setInputValue(lastPart);
    } else {
      setInputValue(newValue);
    }
  };`;

const newHandleInputChange = `  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;

    // We update the state first to ensure UI has the immediate typed text
    setInputValue(newValue);

    // If it contains a comma, let's trigger onChange with the parsed values
    if (newValue.includes(',')) {
      const parts = newValue.split(',');
      const lastPart = parts.pop() || '';
      const completedItems = parts.map(s => s.trim()).filter(Boolean);

      const newItems = [...value];
      let hasChanges = false;

      completedItems.forEach(item => {
        if (!newItems.includes(item) && newItems.length < maxItems) {
          newItems.push(item);
          hasChanges = true;
        }
      });

      if (hasChanges) {
        onChange(newItems);
      }
      // For immediate interactive feedback and correct tokenization behavior
      // when a comma is typed, we clear the completed items and keep the rest.
      setInputValue(lastPart);
    }
  };`;

file = file.replace(oldHandleInputChange, newHandleInputChange);

fs.writeFileSync('src/client/src/pages/GuardsPage.tsx', file);
console.log('Done!');
