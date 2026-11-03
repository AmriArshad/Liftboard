import { svelte } from '@sveltejs/vite-plugin-svelte'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [svelte()],
  test: {
    include: ['tests/unit/**/*.test.ts'],
    // Nothing to test until the parser lands; keep CI green until then.
    passWithNoTests: true,
  },
})
