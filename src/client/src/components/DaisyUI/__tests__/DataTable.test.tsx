import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DataTable from '../DataTable';

describe('DataTable keyboard nested-action isolation', () => {
  it('prevents event propagation when pressing Enter on a nested button within a row', async () => {
     const handleRowClick = vi.fn();
     const handleActionClick = vi.fn();

     const data = [{ id: 1, name: 'Test' }];
     const columns = [{ key: 'name', title: 'Name', prominent: true }];
     const actions = [{ label: 'Edit', onClick: handleActionClick }];

     render(
       <DataTable
         data={data}
         columns={columns as any}
         actions={actions}
         onRowClick={handleRowClick}
       />
     );

     // In a mobile/card view context...
     const editButton = screen.getByRole('button', { name: 'Edit' });
     await userEvent.type(editButton, '{enter}');

     expect(handleActionClick).toHaveBeenCalled();
     // The row click should NOT have been called due to e.stopPropagation() inside the Action button
     expect(handleRowClick).not.toHaveBeenCalled();
  });
});
