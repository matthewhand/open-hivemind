/**
 * Global Edge-Case Testing Utilities
 * Provides standardized malformed and extreme inputs for fuzzing components.
 */

export const FuzzingUtils = {
  // Massive arrays for input testing
  generateMassiveArray: (size: number, prefix: string = 'item') =>
    Array.from({ length: size }, (_, i) => `${prefix}${i}`),

  // Standard unicode fuzzing string
  getUnicodeFuzzString: () => '🎉,  🚀, \u0000, 👾\u200Binvisible, ,  , 🔥',

  // Rapid malformed input sequences to test race conditions
  getRapidMalformedInput: () => 'user1, ,, user2,  ,,, user3   ,, user4,',
};
