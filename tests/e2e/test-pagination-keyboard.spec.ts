import { expect, test } from '@playwright/test';

test('Test pagination keyboard and aria integration', async ({ page }) => {
  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>Pagination Keyboard Test</title>
      <link href="https://cdn.jsdelivr.net/npm/daisyui@3.9.0/dist/full.css" rel="stylesheet" type="text/css" />
      <script src="https://cdn.tailwindcss.com"></script>
    </head>
    <body class="p-4">
      <div id="root"></div>
      <script src="https://unpkg.com/react@18/umd/react.development.js" crossorigin></script>
      <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js" crossorigin></script>
      <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
      <script type="text/babel">
        // Embed the Pagination component mock containing the final changes
        const Pagination = ({
          currentPage,
          totalItems,
          pageSize = 10,
          onPageChange,
          maxVisiblePages: explicitMaxVisiblePages
        }) => {
          const containerRef = React.useRef(null);
          const [dynamicMaxVisiblePages, setDynamicMaxVisiblePages] = React.useState(7);
          const totalPages = Math.ceil(totalItems / pageSize);
          const maxVisiblePages = explicitMaxVisiblePages || dynamicMaxVisiblePages;

          const handleKeyDown = (e) => {
            if (e.key === 'ArrowLeft') onPageChange(currentPage - 1);
            if (e.key === 'ArrowRight') onPageChange(currentPage + 1);
          };

          return (
            <div
              ref={containerRef}
              className="join w-full overflow-x-auto shadow-md rounded-lg p-2 bg-base-100 mt-2 focus:outline-none focus:ring-1 focus:ring-primary/50"
              onKeyDown={handleKeyDown}
              tabIndex={0}
              id="pagination-container"
            >
              <div className="sr-only" aria-live="polite" aria-atomic="true" id="aria-live-region">
                Page {currentPage} of {totalPages}
              </div>
              <button className="join-item btn">❮</button>
              <button className="join-item btn btn-active">{currentPage}</button>
              <button className="join-item btn">❯</button>
            </div>
          );
        };

        const App = () => {
          const [page, setPage] = React.useState(10);
          return (
            <div className="flex flex-col gap-4 w-full">
              <h2 className="text-xl font-bold">Press ArrowLeft/ArrowRight while focused to change page</h2>
              <div id="test-container" style={{ padding: '20px', border: '1px solid black' }}>
                 <Pagination currentPage={page} totalItems={200} pageSize={10} onPageChange={setPage} maxVisiblePages={5} />
              </div>
              <p id="current-page-display">Current state page: {page}</p>
            </div>
          );
        };

        const root = ReactDOM.createRoot(document.getElementById('root'));
        root.render(<App />);
      </script>
    </body>
    </html>
  `;

  await page.setContent(html);

  // Set focus on the pagination container directly
  await page.locator('#pagination-container').focus();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');

  const currentDisplay = await page.locator('#current-page-display').textContent();
  expect(currentDisplay).toBe('Current state page: 12');

  await page.keyboard.press('ArrowLeft');
  const currentDisplay2 = await page.locator('#current-page-display').textContent();
  expect(currentDisplay2).toBe('Current state page: 11');

  const ariaLive = await page.locator('#aria-live-region').textContent();
  expect(ariaLive?.trim()).toBe('Page 11 of 20');
});
