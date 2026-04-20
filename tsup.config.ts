import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['server/server.ts'],
  format: ['esm'],
  outDir: 'dist/server',
  clean: false, // Don't clean because vite might build into dist/
  target: 'node20',
  sourcemap: true,
});
