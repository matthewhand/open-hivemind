import { test, expect } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

test('Test pagination visual regressions', async ({ page }) => {
  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>Pagination Test</title>
      <link href="https://cdn.jsdelivr.net/npm/daisyui@3.9.0/dist/full.css" rel="stylesheet" type="text/css" />
      <script src="https://cdn.tailwindcss.com"></script>
    </head>
    <body>
      <div id="root"></div>
      <script src="https://unpkg.com/react@18/umd/react.development.js" crossorigin></script>
      <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js" crossorigin></script>
      <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
      <script type="text/babel">
        const Pagination = ({
          currentPage,
          totalItems,
          pageSize = 10,
          style = 'standard',
          className = '',
        }) => {
          const totalPages = Math.ceil(totalItems / pageSize);

          const onPageChange = () => {}; // mock for testing

          const pageNumbers = React.useMemo(() => {
            const pages = [];
            if (totalPages <= 7) {
              for (let i = 1; i <= totalPages; i++) {
                pages.push(i);
              }
            } else {
              pages.push(1);
              if (currentPage <= 4) {
                for (let i = 2; i <= 5; i++) {
                  pages.push(i);
                }
                pages.push('...next');
                pages.push(totalPages);
              } else if (currentPage >= totalPages - 3) {
                pages.push('...prev');
                for (let i = totalPages - 4; i <= totalPages - 1; i++) {
                  pages.push(i);
                }
                pages.push(totalPages);
              } else {
                pages.push('...prev');
                for (let i = currentPage - 1; i <= currentPage + 1; i++) {
                  pages.push(i);
                }
                pages.push('...next');
                pages.push(totalPages);
              }
            }
            return pages;
          }, [totalPages, currentPage]);

          const handleJumpPrev = () => {
            onPageChange(Math.max(1, currentPage - 5));
          };

          const handleJumpNext = () => {
            onPageChange(Math.min(totalPages, currentPage + 5));
          };

          if (totalPages <= 1) {
            return null;
          }

          return (
            <div className={\`join \${className}\`} role="navigation" aria-label="Pagination">
              {style === 'extended' && (
                <button
                  className="join-item btn"
                  disabled={currentPage === 1}
                  aria-label="Go to first page"
                >
                  «
                </button>
              )}
              <button
                className="join-item btn"
                disabled={currentPage === 1}
                aria-label="Go to previous page"
              >
                ‹
              </button>

              {style !== 'compact' &&
                pageNumbers.map((page, index) => {
                  if (typeof page === 'number') {
                    return (
                      <button
                        key={index}
                        className={\`join-item btn \${currentPage === page ? 'btn-active' : ''}\`}
                        aria-current={currentPage === page ? 'page' : undefined}
                        aria-label={\`Go to page \${page}\`}
                      >
                        {page}
                      </button>
                    );
                  }
                  if (page === '...prev') {
                    return (
                      <button
                        key={index}
                        id="prev-ellipsis"
                        className="join-item btn bg-transparent border-transparent hover:bg-base-200 text-base-content/50 focus:outline-none focus:ring focus:ring-primary focus:bg-base-200 group relative flex items-center justify-center transition-colors"
                        aria-label="Jump backward 5 pages"
                        title="Jump backward 5 pages"
                      >
                        <span className="group-hover:hidden group-focus:hidden absolute">•••</span>
                        <span className="hidden group-hover:inline group-focus:inline absolute text-lg">«</span>
                      </button>
                    );
                  }
                  if (page === '...next') {
                    return (
                      <button
                        key={index}
                        id="next-ellipsis"
                        className="join-item btn bg-transparent border-transparent hover:bg-base-200 text-base-content/50 focus:outline-none focus:ring focus:ring-primary focus:bg-base-200 group relative flex items-center justify-center transition-colors"
                        aria-label="Jump forward 5 pages"
                        title="Jump forward 5 pages"
                      >
                        <span className="group-hover:hidden group-focus:hidden absolute">•••</span>
                        <span className="hidden group-hover:inline group-focus:inline absolute text-lg">»</span>
                      </button>
                    );
                  }
                  return null;
                })}

              {style === 'compact' && (
                <button className="join-item btn" disabled>
                  Page {currentPage} of {totalPages}
                </button>
              )}

              <button
                className="join-item btn"
                disabled={currentPage === totalPages}
                aria-label="Go to next page"
              >
                ›
              </button>
              {style === 'extended' && (
                <button
                  className="join-item btn"
                  disabled={currentPage === totalPages}
                  aria-label="Go to last page"
                >
                  »
                </button>
              )}
            </div>
          );
        };

        const App = () => {
          return (
            <div className="p-8 flex flex-col gap-8">
              <div>
                <h2 className="mb-4 text-xl font-bold">Standard Style - Middle Page</h2>
                <Pagination currentPage={10} totalItems={200} pageSize={10} style="standard" />
              </div>
              <div id="hover-focus-test">
                <h2 className="mb-4 text-xl font-bold">Extended Style - Focus/Hover Test</h2>
                <Pagination currentPage={10} totalItems={200} pageSize={10} style="extended" />
              </div>
            </div>
          );
        }

        const root = ReactDOM.createRoot(document.getElementById('root'));
        root.render(<App />);
      </script>
    </body>
    </html>
  `;

  await page.setContent(html);
  await page.waitForTimeout(1000);

  // Set focus on an ellipsis button to trigger group-focus CSS state
  await page.locator('#hover-focus-test #next-ellipsis').focus();
  await page.waitForTimeout(500);

  await page.screenshot({ path: 'docs/screenshots/pagination-after-accessible.png', fullPage: true });
});
