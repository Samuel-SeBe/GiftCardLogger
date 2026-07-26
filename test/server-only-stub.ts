// The real `server-only` package throws when imported outside a React Server
// Component. Unit tests exercise the pure logic in Node, so we alias it to
// this no-op (see vitest.config.ts).
export {};
