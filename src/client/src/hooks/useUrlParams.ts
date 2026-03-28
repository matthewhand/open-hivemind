import { useCallback, useEffect, useRef, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

/**
 * Parameter type definitions for URL-persisted state.
 *
 * Each key maps to a config object describing the param's type, default value,
 * and optionally whether URL updates should be debounced (useful for search inputs).
 */
export interface ParamConfig {
  type: 'string' | 'number' | 'string[]';
  default: string | number | string[];
  /** Debounce URL updates by this many ms (e.g. 300 for search inputs) */
  debounce?: number;
}

export type ParamSchema = Record<string, ParamConfig>;

type InferValue<T extends ParamConfig> =
  T['type'] extends 'number' ? number :
  T['type'] extends 'string[]' ? string[] :
  string;

type InferValues<S extends ParamSchema> = {
  [K in keyof S]: InferValue<S[K]>;
};

type SetterFn<S extends ParamSchema> = <K extends keyof S & string>(
  key: K,
  value: InferValues<S>[K],
) => void;

/**
 * useUrlParams — syncs filter/search/pagination state to URL search params.
 *
 * - Reads initial values from the URL on mount (falls back to defaults).
 * - Writes values back to the URL when they change.
 * - Supports debounced writes for search inputs.
 * - Browser back/forward navigation updates the returned values.
 *
 * @example
 * const { values, setValue } = useUrlParams({
 *   search:  { type: 'string',   default: '',    debounce: 300 },
 *   status:  { type: 'string',   default: 'all' },
 *   page:    { type: 'number',   default: 1 },
 *   tags:    { type: 'string[]', default: [] },
 * });
 */
export function useUrlParams<S extends ParamSchema>(schema: S) {
  const [searchParams, setSearchParams] = useSearchParams();
  const debounceTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  // Parse current URL params into typed values according to schema
  const values = useMemo(() => {
    const result: Record<string, unknown> = {};
    for (const [key, config] of Object.entries(schema)) {
      const raw = searchParams.get(key);
      if (raw === null || raw === '') {
        result[key] = config.default;
      } else {
        switch (config.type) {
          case 'number':
            result[key] = Number(raw) || (config.default as number);
            break;
          case 'string[]':
            result[key] = raw.split(',').filter(Boolean);
            break;
          default:
            result[key] = raw;
        }
      }
    }
    return result as InferValues<S>;
    // We intentionally depend on searchParams.toString() to react to URL changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams.toString()]);

  // Store latest schema in a ref so we don't need it in deps
  const schemaRef = useRef(schema);
  schemaRef.current = schema;

  const setValue: SetterFn<S> = useCallback(
    (key, value) => {
      const config = schemaRef.current[key];
      if (!config) return;

      const applyUpdate = () => {
        setSearchParams((prev) => {
          const next = new URLSearchParams(prev);

          // Serialize the value
          let serialized: string;
          if (config.type === 'string[]') {
            serialized = (value as string[]).filter(Boolean).join(',');
          } else {
            serialized = String(value);
          }

          // Only set param if it differs from the default; remove if it matches default
          const defaultSerialized =
            config.type === 'string[]'
              ? (config.default as string[]).join(',')
              : String(config.default);

          if (serialized === defaultSerialized) {
            next.delete(key);
          } else {
            next.set(key, serialized);
          }

          return next;
        }, { replace: true });
      };

      if (config.debounce) {
        // Clear previous timer for this key
        if (debounceTimers.current[key]) {
          clearTimeout(debounceTimers.current[key]);
        }
        debounceTimers.current[key] = setTimeout(applyUpdate, config.debounce);
      } else {
        applyUpdate();
      }
    },
    [setSearchParams],
  );

  // Cleanup debounce timers on unmount
  useEffect(() => {
    const timers = debounceTimers.current;
    return () => {
      Object.values(timers).forEach(clearTimeout);
    };
  }, []);

  return { values, setValue } as const;
}

export default useUrlParams;
