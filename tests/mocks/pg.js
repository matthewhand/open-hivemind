const mockQuery = jest.fn().mockResolvedValue({ rows: [] });
const mockEnd = jest.fn().mockResolvedValue(undefined);

const Pool = jest.fn().mockImplementation(() => ({
  query: mockQuery,
  end: mockEnd,
}));

module.exports = { Pool };
