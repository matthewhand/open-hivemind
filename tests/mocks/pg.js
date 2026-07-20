const mockQuery = jest.fn().mockResolvedValue({ rows: [], rowCount: 0 });
const mockClient = { query: mockQuery, release: jest.fn() };
const mockEnd = jest.fn().mockResolvedValue(undefined);

const Pool = jest.fn().mockImplementation(() => ({
  query: mockQuery,
  end: mockEnd,
  // Exercised by PostgresWrapper.transaction(), which acquires a dedicated
  // client for the duration of the transaction.
  connect: jest.fn().mockResolvedValue(mockClient),
}));

module.exports = { Pool };
