import { defineConfig } from 'vite';

const isPreview = process.env.BASE44_PREVIEW_MODE === '1';

export default defineConfig({
  server: {
    port: 5173,
    // In the Base44 preview, bind all interfaces and allow the sandbox proxy host.
    ...(isPreview
      ? {
          host: true as const,
          allowedHosts: [`.${process.env.BASE44_SANDBOX_HOST_DOMAIN ?? ''}`],
        }
      : {}),
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
