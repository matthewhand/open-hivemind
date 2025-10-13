const mockHash = (input: string): string => `mock-bcrypt-hash:${input}`;

const bcryptMock = {
  hash: async (input: string): Promise<string> => mockHash(input),
  hashSync: (input: string): string => mockHash(input),
  compare: async (input: string, hash: string): Promise<boolean> =>
    hash === mockHash(input) || hash.startsWith('test-hash-for-') || hash === 'test-admin-hash',
  compareSync: (input: string, hash: string): boolean =>
    hash === mockHash(input) || hash.startsWith('test-hash-for-') || hash === 'test-admin-hash',
  genSalt: async (): Promise<string> => 'mock-bcrypt-salt',
  genSaltSync: (): string => 'mock-bcrypt-salt',
};

export default bcryptMock;
module.exports = bcryptMock;
