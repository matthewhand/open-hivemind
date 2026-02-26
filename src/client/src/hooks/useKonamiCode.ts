import { useEffect, useRef } from 'react';

const KONAMI_CODE = [
  'ArrowUp',
  'ArrowUp',
  'ArrowDown',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'ArrowLeft',
  'ArrowRight',
  'b',
  'a',
];

export const useKonamiCode = (callback: () => void) => {
  const index = useRef(0);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      const expectedKey = KONAMI_CODE[index.current]?.toLowerCase();

      if (expectedKey && key === expectedKey) {
        index.current += 1;
        if (index.current === KONAMI_CODE.length) {
          callback();
          index.current = 0;
        }
      } else {
        // Reset if key is wrong, but check if it starts the sequence again
        // Simple reset for now is fine for Konami code
        index.current = 0;

        // Edge case: if the wrong key is actually the start of the sequence (ArrowUp)
        if (key === KONAMI_CODE[0].toLowerCase()) {
            index.current = 1;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [callback]);
};
