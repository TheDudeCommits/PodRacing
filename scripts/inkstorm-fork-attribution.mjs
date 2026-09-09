/** Disposable diagnostic server. Exposes the app only through a Vite transform;
 * the production entry and application source are not modified. */
import { createServer } from 'vite';
const server = await createServer({
  server: { host: '127.0.0.1', port: 5197, strictPort: true },
  plugins: [{ name: 'fork-attribution-only', enforce: 'post', transform(code, id) {
    if (id.endsWith('/src/main.ts')) return `${code}\nwindow.__FORK_PROBE_APP__ = app;`;
  } }],
});
await server.listen();
console.log('Fork attribution server: http://127.0.0.1:5197');
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, async () => { await server.close(); process.exit(0); });
