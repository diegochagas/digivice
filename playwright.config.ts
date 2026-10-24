import { defineConfig, devices } from '@playwright/test'

// The e2e server uses its own data dir and port, so the real pet in ./data is never touched.
const PORT = 3031
const baseURL = process.env.BASE_URL ?? `http://localhost:${PORT}`
const e2eEnv = {
  PORT: String(PORT),
  DATA_DIR: 'e2e/.data',
  OLLAMA_URL: process.env.OLLAMA_URL ?? 'http://127.0.0.1:9', // unreachable on purpose: the flow never chats
  CHAT_MODEL: 'test',
  EMBED_MODEL: 'test',
  SEARXNG_URL: '',
}

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: { baseURL, trace: 'retain-on-failure' },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
  webServer: process.env.BASE_URL
    ? undefined
    : { command: 'rm -rf e2e/.data && npm run build && npm run start', url: baseURL, reuseExistingServer: false, timeout: 240_000, env: e2eEnv },
})
