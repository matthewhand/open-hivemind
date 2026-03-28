import { useState, useCallback, useMemo, useRef } from 'react';

export interface DiffEntry {
  path: string;
  type: 'added' | 'removed' | 'changed';
  oldValue?: unknown;
  newValue?: unknown;
}

export interface ConfigDiffResult {
  /** Whether any fields differ between original and current config */
  hasChanges: boolean;
  /** List of individual field changes with dot-notation paths */
  diff: DiffEntry[];
  /** Flat list of changed field paths (convenience accessor) */
  changedFields: string[];
  /** Snapshot the current config as the new "original" baseline */
  setOriginalConfig: (config: Record<string, unknown>) => void;
  /** Reset current config back to the original snapshot */
  resetToOriginal: () => Record<string, unknown>;
  /** The original config snapshot for reference */
  originalConfig: Record<string, unknown>;
}

/**
 * Flatten a nested object into dot-notation key/value pairs.
 *
 * Example: { a: { b: 1 } } => { "a.b": 1 }
 */
function flattenObject(
  obj: Record<string, unknown>,
  prefix = '',
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const key of Object.keys(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    const value = obj[key];

    if (
      value !== null &&
      typeof value === 'object' &&
      !Array.isArray(value)
    ) {
      Object.assign(
        result,
        flattenObject(value as Record<string, unknown>, fullKey),
      );
    } else {
      result[fullKey] = value;
    }
  }

  return result;
}

/**
 * Compare two config objects and return a list of changes.
 */
function computeDiff(
  original: Record<string, unknown>,
  current: Record<string, unknown>,
): DiffEntry[] {
  const flatOld = flattenObject(original);
  const flatNew = flattenObject(current);
  const allKeys = new Set([...Object.keys(flatOld), ...Object.keys(flatNew)]);
  const entries: DiffEntry[] = [];

  for (const key of allKeys) {
    const hasOld = key in flatOld;
    const hasNew = key in flatNew;

    if (hasOld && !hasNew) {
      entries.push({ path: key, type: 'removed', oldValue: flatOld[key] });
    } else if (!hasOld && hasNew) {
      entries.push({ path: key, type: 'added', newValue: flatNew[key] });
    } else if (hasOld && hasNew) {
      const oldVal = flatOld[key];
      const newVal = flatNew[key];

      // Deep equality for arrays, strict equality for primitives
      const isEqual = Array.isArray(oldVal) && Array.isArray(newVal)
        ? JSON.stringify(oldVal) === JSON.stringify(newVal)
        : oldVal === newVal;

      if (!isEqual) {
        entries.push({
          path: key,
          type: 'changed',
          oldValue: oldVal,
          newValue: newVal,
        });
      }
    }
  }

  return entries;
}

/**
 * Hook to track config changes against an original snapshot.
 *
 * @param currentConfig - The live/form config state to compare against the original.
 * @returns ConfigDiffResult with change detection, diff entries, and reset helpers.
 *
 * @example
 * const { hasChanges, diff, resetToOriginal, setOriginalConfig } = useConfigDiff(formData);
 *
 * useEffect(() => { setOriginalConfig(apiResponse); }, [apiResponse]);
 */
export function useConfigDiff(
  currentConfig: Record<string, unknown>,
): ConfigDiffResult {
  const [originalConfig, setOriginalConfigState] = useState<Record<string, unknown>>({});
  const originalRef = useRef<Record<string, unknown>>({});

  const setOriginalConfig = useCallback((config: Record<string, unknown>) => {
    const snapshot = JSON.parse(JSON.stringify(config));
    originalRef.current = snapshot;
    setOriginalConfigState(snapshot);
  }, []);

  const diff = useMemo(
    () => computeDiff(originalRef.current, currentConfig),
    [currentConfig, originalConfig], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const hasChanges = diff.length > 0;

  const changedFields = useMemo(() => diff.map((d) => d.path), [diff]);

  const resetToOriginal = useCallback((): Record<string, unknown> => {
    return JSON.parse(JSON.stringify(originalRef.current));
  }, []);

  return {
    hasChanges,
    diff,
    changedFields,
    setOriginalConfig,
    resetToOriginal,
    originalConfig,
  };
}

export default useConfigDiff;
