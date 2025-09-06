import { defineConfig } from "@playwright/test";
export default defineConfig({
  timeout: 20000,
  use: {
    headless: true,
    ignoreHTTPSErrors: true
  }
});
