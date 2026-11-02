import { chromium } from "@playwright/test";
import { resolve } from "node:path";

const ARTIFACTS_DIR = "/home/mehedi/.gemini/antigravity-cli/brain/ffe3ff64-8cd8-48fa-bf81-e6ff48eb4a20";

async function capture() {
  const browser = await chromium.launch({ headless: true });

  // 1. Desktop (1440 x 900)
  {
    const page = await browser.newPage({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 2,
    });
    await page.goto("http://localhost:5173/", { waitUntil: "networkidle" });
    await page.waitForTimeout(1000);
    await page.screenshot({
      path: resolve(ARTIFACTS_DIR, "preview-public-homepage-polished.png"),
      fullPage: true,
    });
    console.log("Desktop screenshot captured.");
    await page.close();
  }

  // 2. Tablet (768 x 1024)
  {
    const page = await browser.newPage({
      viewport: { width: 768, height: 1024 },
      deviceScaleFactor: 2,
    });
    await page.goto("http://localhost:5173/", { waitUntil: "networkidle" });
    await page.waitForTimeout(1000);
    await page.screenshot({
      path: resolve(ARTIFACTS_DIR, "tablet-public-homepage.png"),
      fullPage: true,
    });
    console.log("Tablet screenshot captured.");
    await page.close();
  }

  // 3. Mobile (390 x 844)
  {
    const page = await browser.newPage({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
    });
    await page.goto("http://localhost:5173/", { waitUntil: "networkidle" });
    await page.waitForTimeout(1000);
    await page.screenshot({
      path: resolve(ARTIFACTS_DIR, "mobile-public-homepage-polished.png"),
      fullPage: true,
    });
    console.log("Mobile screenshot captured.");
    await page.close();
  }

  await browser.close();
}

capture().catch((err) => {
  console.error("Capture failed:", err);
  process.exit(1);
});
