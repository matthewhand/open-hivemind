
import DuplicateMessageDetector from './src/message/helpers/processing/DuplicateMessageDetector';
import messageConfig from './src/config/messageConfig';

// Mock config
jest.mock('./src/config/messageConfig', () => ({
  get: (key: string) => {
    if (key === 'MESSAGE_SUPPRESS_DUPLICATES') return true;
    if (key === 'MESSAGE_DUPLICATE_WINDOW_MS') return 300000;
    return null;
  }
}));

async function runBenchmark() {
  const detector = DuplicateMessageDetector.getInstance();
  const channelId = 'bench-channel';

  // Create a long string (2000 chars)
  const longString = 'a'.repeat(2000);
  const differentLongString = 'b'.repeat(2000);
  // Slightly different string (1 char different)
  const slightlyDifferent = 'a'.repeat(1999) + 'b';
  // Different length
  const differentLength = 'a'.repeat(2010); // Diff 10 > threshold 5

  const externalHistory = [longString];

  // Warmup
  detector.isDuplicate(channelId, longString, externalHistory);

  console.log('Starting benchmark...');
  const start = process.hrtime();

  const iterations = 1000;

  for (let i = 0; i < iterations; i++) {
    // Case 1: Identical (fastest)
    detector.isDuplicate(channelId, longString, externalHistory);

    // Case 2: Slightly different (full Levenshtein)
    // optimizing this requires specialized Levenshtein, but we are focusing on avoiding Levenshtein for non-duplicates
    detector.isDuplicate(channelId, slightlyDifferent, externalHistory);

    // Case 3: Completely different content, same length (full Levenshtein currently)
    detector.isDuplicate(channelId, differentLongString, externalHistory);

    // Case 4: Different length (currently full Levenshtein, target for optimization)
    detector.isDuplicate(channelId, differentLength, externalHistory);
  }

  const end = process.hrtime(start);
  const timeInMs = (end[0] * 1000 + end[1] / 1e6);

  console.log(`Total time for ${iterations} iterations: ${timeInMs.toFixed(2)}ms`);
  console.log(`Average time per iteration: ${(timeInMs / iterations).toFixed(4)}ms`);
}

runBenchmark().catch(console.error);
