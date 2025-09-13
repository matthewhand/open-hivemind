describe('array utils', () => {
  test('includes works', () => { expect([1,2,3]).toContain(3); });
  test('length zero', () => { expect([].length).toBe(0); });
});
