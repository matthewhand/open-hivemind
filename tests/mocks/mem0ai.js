const Memory = jest.fn().mockImplementation(() => ({
  add: jest.fn().mockResolvedValue({ results: [] }),
  search: jest.fn().mockResolvedValue({ results: [] }),
  getAll: jest.fn().mockResolvedValue({ results: [] }),
  get: jest.fn().mockResolvedValue(null),
  update: jest.fn().mockResolvedValue({}),
  delete: jest.fn().mockResolvedValue(undefined),
  deleteAll: jest.fn().mockResolvedValue(undefined),
  history: jest.fn().mockResolvedValue([]),
  reset: jest.fn().mockResolvedValue(undefined),
}));

module.exports = { Memory };
