import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 60000,
  use: {
    baseURL: 'http://localhost:8080',
  },
  webServer: [
    {
      command: 'python3 -m http.server 8080',
      port: 8080,
      reuseExistingServer: true,
    },
    {
      command: 'bash ./tests/start-emulators.sh',
      port: 9099,
      reuseExistingServer: true,
      timeout: 30000,
    },
  ],
});
