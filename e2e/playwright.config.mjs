import { defineConfig } from "@playwright/test";
import path from "path";
export default defineConfig({
  // patrz tylko w e2e/tests
  testDir: path.resolve("./e2e/tests"),
  timeout: 20000,
  use: { headless: true, ignoreHTTPSErrors: true }
});
