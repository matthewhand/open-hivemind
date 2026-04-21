const fs = require('fs');

const hookTestFile = 'src/client/src/hooks/__tests__/useInactivity.test.ts';
let code = fs.readFileSync(hookTestFile, 'utf8');

// Use renderHook instead of runHook custom implementation
code = code.replace(
`/**
 * Minimal hook runner that calls the hook function directly and provides
 * a way to re-invoke it (simulating re-renders).
 */
function runHook<T, R>(hookFn: () => R) {
  let result: R;
  const invoke = () => {
    result = hookFn();
    return result;
  };
  invoke();
  return {
    get result() { return result!; },
    rerender: invoke,
  };
}`,
`import { renderHook, act } from '@testing-library/react';`);

// Replace occurrences
code = code.replace(/const \{ result \} = runHook\(\(\) => useInactivity\(\{ timeoutMs: 1000 \}\)\);/g, "const { result } = renderHook(() => useInactivity({ timeoutMs: 1000 }));");
code = code.replace(/expect\(result\.isIdle\)/g, "expect(result.current.isIdle)");
code = code.replace(/const \{ result \} = runHook\(\(\) => useInactivity\(\{ timeoutMs \}\)\);/g, "const { result } = renderHook(() => useInactivity({ timeoutMs }));");
code = code.replace(/vi\.advanceTimersByTime\(/g, "act(() => { vi.advanceTimersByTime(");
code = code.replace(/runHook\(\(\) => useInactivity\(\{ timeoutMs: 3000, onIdle \}\)\);/g, "renderHook(() => useInactivity({ timeoutMs: 3000, onIdle }));");
code = code.replace(/window\.dispatchEvent\(/g, "act(() => { window.dispatchEvent(");
code = code.replace(/const \{ result \} = runHook\(\(\) =>\n      useInactivity\(\{ timeoutMs: 1000, onIdle, onWake \}\)\n    \);/g, "const { result } = renderHook(() =>\n      useInactivity({ timeoutMs: 1000, onIdle, onWake })\n    );");
code = code.replace(/const \{ result, rerender \} = runHook\(\(\) => useInactivity\(\{ timeoutMs \}\)\);/g, "const { result } = renderHook(() => useInactivity({ timeoutMs }));");
code = code.replace(/rerender\(\); \/\/ The minimal hook runner needs this for state changes that don't trigger rerenders naturally\n/g, ""); // Not needed with testing-library if state changes trigger rerender automatically or through act
code = code.replace(/const \{ result \} = runHook\(\(\) => useInactivity\(\{ timeoutMs: 5000 \}\)\);/g, "const { unmount, result } = renderHook(() => useInactivity({ timeoutMs: 5000 }));");
code = code.replace(/expect\(result\)\.toBeDefined\(\);\n    spyRemoveEventListener\.mockRestore\(\);/g, "expect(result.current).toBeDefined();\n    unmount();\n    // 6 events are attached by default\n    expect(spyRemoveEventListener).toHaveBeenCalledTimes(6);\n    spyRemoveEventListener.mockRestore();");
code = code.replace(/result\.reset\(\);/g, "act(() => { result.current.reset(); });");
code = code.replace(/expect\(result\.lastActive\)/g, "expect(result.current.lastActive)");
code = code.replace(/const \{ result \} = runHook\(\(\) =>\n      useInactivity\(\{ timeoutMs, events: \['keydown'\] \}\)\n    \);/g, "const { result } = renderHook(() =>\n      useInactivity({ timeoutMs, events: ['keydown'] })\n    );");

// Fix the vi.advanceTimersByTime wrappers
code = code.replace(/act\(\(\) => \{ vi\.advanceTimersByTime\((.*?)\);\n/g, "act(() => { vi.advanceTimersByTime($1); });\n");
code = code.replace(/act\(\(\) => \{ window\.dispatchEvent\((.*?)\);\n/g, "act(() => { window.dispatchEvent($1); });\n");

fs.writeFileSync(hookTestFile, code);
