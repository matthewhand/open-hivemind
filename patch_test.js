const fs = require('fs');
let content = fs.readFileSync('src/client/src/components/__tests__/SearchFilterBar.test.tsx', 'utf8');

// fix multiple elements "General" (one is option, one is span)
content = content.replace(
  "expect(screen.getByText('General')).toBeInTheDocument();",
  "expect(screen.getAllByText('General')[0]).toBeInTheDocument();"
);

// fix act warning by wrapping the timer advance and click
content = content.replace(
  "    const clearButton = screen.getByLabelText('Remove category filter');\n    fireEvent.click(clearButton);",
  "    const clearButton = screen.getByLabelText('Remove category filter');\n    import { act } from '@testing-library/react';\n    act(() => { fireEvent.click(clearButton); });"
);

content = content.replace(
  "    // Fast forward time\n    jest.advanceTimersByTime(250);",
  "    // Fast forward time\n    act(() => { jest.advanceTimersByTime(250); });"
);

fs.writeFileSync('src/client/src/components/__tests__/SearchFilterBar.test.tsx', content);
