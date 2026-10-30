// In-memory stand-in for the D1 counter table used by the rate limiter: understands only the statements it issues.
export function memoryD1(seed: Record<string, number> = {}) {
  const counts = new Map(Object.entries(seed));
  const expires = new Map<string, number>();
  const statements: string[] = [];
  return {
    counts, expires, statements,
    prepare(query: string) {
      statements.push(query);
      return {
        bind(...values: unknown[]) {
          const run = async () => {
            if (query.startsWith('DELETE')) for (const [key, at] of expires) if (at < Number(values[0])) { counts.delete(key); expires.delete(key); }
            return {};
          };
          return {
            run,
            async first<T>() {
              if (!query.startsWith('INSERT')) { await run(); return null; }
              const key = String(values[0]);
              const n = (counts.get(key) ?? 0) + 1;
              counts.set(key, n);
              if (!expires.has(key)) expires.set(key, Number(values[1]));
              return { n } as T;
            },
          };
        },
      };
    },
  };
}
