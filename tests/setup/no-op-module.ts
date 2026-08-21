/**
 * Stands in for the `server-only` and `client-only` marker packages.
 *
 * Those packages exist purely to make the bundler throw when a module lands
 * in the wrong graph. Vitest runs in plain Node, where neither graph exists,
 * so importing the real package fails at collection time. This empty module
 * is the equivalent of the `react-server` build the Next.js server graph
 * already resolves to — it removes the marker without changing behaviour.
 */
export {};
