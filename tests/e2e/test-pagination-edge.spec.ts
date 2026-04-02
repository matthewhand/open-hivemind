import { expect, test } from '@playwright/test';

test('DataTable pagination out-of-bounds reset', async ({ page }) => {
  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>DataTable Pagination Edge Case</title>
      <link href="https://cdn.jsdelivr.net/npm/daisyui@3.9.0/dist/full.css" rel="stylesheet" type="text/css" />
      <script src="https://cdn.tailwindcss.com"></script>
    </head>
    <body class="p-8">
      <div id="root"></div>
      <script src="https://unpkg.com/react@18/umd/react.development.js" crossorigin></script>
      <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js" crossorigin></script>
      <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
      <script type="text/babel">
        const { useState, useMemo, useRef, useEffect } = React;
        const DataTable = ({
          data,
          columns,
          pagination = { pageSize: 5, showSizeChanger: true, pageSizeOptions: [5, 10, 25, 50, 100] },
          enableInfiniteScrollToggle = false,
        }) => {
          const [currentPage, setCurrentPage] = useState(1);
          const [pageSize, setPageSize] = useState(pagination.pageSize);
          const [searchTerm, setSearchTerm] = useState('');
          const [isInfiniteScroll, setIsInfiniteScroll] = useState(false);
          const loadMoreRef = useRef(null);

          const filteredData = useMemo(() => {
            let filtered = [...data];
            if (searchTerm) {
              const lowerSearchTerm = searchTerm.toLowerCase();
              filtered = filtered.filter(row =>
                Object.values(row).some(value =>
                  String(value).toLowerCase().includes(lowerSearchTerm),
                ),
              );
            }
            return filtered;
          }, [data, searchTerm]);

          const totalPages = Math.ceil(filteredData.length / pageSize);

          // __PATCH_PLACEHOLDER__

          const paginatedData = useMemo(() => {
            if (isInfiniteScroll) {
              return filteredData.slice(0, currentPage * pageSize);
            }
            const startIndex = (currentPage - 1) * pageSize;
            return filteredData.slice(startIndex, startIndex + pageSize);
          }, [filteredData, currentPage, pageSize, isInfiniteScroll]);


          return (
            <div className="space-y-4">
              <div className="flex gap-4 items-center">
                <input
                  id="search"
                  className="input input-bordered input-sm"
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>
              <table className="table table-zebra w-full" id="table">
                <thead><tr><th>Name</th></tr></thead>
                <tbody>
                  {paginatedData.map((row, i) => <tr key={i}><td>{row.name}</td></tr>)}
                  {paginatedData.length === 0 && (
                    <tr><td className="text-center py-8">
                      <div className="flex flex-col items-center gap-2">
                        <span className="text-4xl">📭</span>
                        <span className="text-base-content/60" id="no-data">No data found</span>
                      </div>
                    </td></tr>
                  )}
                </tbody>
              </table>
              <div className="flex items-center gap-4">
                <span id="current-page" className="badge badge-primary">Page {currentPage} of {Math.max(1, totalPages)}</span>
                <div className="join">
                  <button className="join-item btn btn-sm" id="prev-page" disabled={currentPage === 1} onClick={() => setCurrentPage(c => c - 1)}>❮</button>
                  <button className="join-item btn btn-sm" id="next-page" disabled={currentPage >= totalPages} onClick={() => setCurrentPage(c => c + 1)}>❯</button>
                </div>
              </div>
            </div>
          );
        };

        const data = Array.from({length: 25}, (_, i) => ({ name: 'User ' + i }));
        // Specifically modify one to ensure a match on a single item when searching
        data[24] = { name: 'Admin Jane' };

        const columns = [{ key: 'name', title: 'Name' }];

        const App = () => {
          return (
            <div>
              <h2 className="text-xl font-bold mb-4">DataTable Pagination Bug Demonstration</h2>
              <DataTable data={data} columns={columns} />
            </div>
          );
        };

        const root = ReactDOM.createRoot(document.getElementById('root'));
        root.render(<App />);
      </script>
    </body>
    </html>
  `;

  const isBefore = process.env.TEST_PHASE === 'before';

  let contentHtml = html;
  if (!isBefore) {
    const fixCode = `
          // Prevent out-of-bounds page state when filters reduce total pages
          React.useEffect(() => {
            if (totalPages > 0 && currentPage > totalPages) {
              setCurrentPage(1);
            } else if (totalPages === 0 && currentPage !== 1) {
              setCurrentPage(1);
            }
          }, [totalPages, currentPage]);
    `;
    contentHtml = contentHtml.replace('// __PATCH_PLACEHOLDER__', fixCode);
  } else {
    contentHtml = contentHtml.replace('// __PATCH_PLACEHOLDER__', '');
  }

  await page.setContent(contentHtml);
  // let babel/react render

  // Navigate to Page 3
  await page.locator('#next-page').click();
  await page.locator('#next-page').click();

  // Search for "Admin"
  await page.locator('#search').fill('Admin');

  const prefix = isBefore ? 'before' : 'after';
  const screenshotPath = 'docs/screenshots/pagination-' + prefix + '.png';
  await page.screenshot({ path: screenshotPath, fullPage: true });

  const currentPage = await page.locator('#current-page').textContent();
  const rows = await page.locator('#table tbody tr td').count();

  console.log(
    '[' + prefix.toUpperCase() + '] Current Page Info: ' + currentPage + ', Rows Count: ' + rows
  );

  if (isBefore) {
    const noData = await page.locator('#no-data').isVisible();
    expect(noData).toBe(true);
  } else {
    const hasData = await page.locator('#table tbody tr td', { hasText: 'Admin Jane' }).isVisible();
    expect(hasData).toBe(true);
  }
});
