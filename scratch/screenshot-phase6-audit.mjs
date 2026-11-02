import { chromium } from "/home/mehedi/Desktop/MediConnectBD/frontend/node_modules/playwright/index.mjs";

async function main() {
  const browser = await chromium.launch({ headless: true });

  const viewports = [
    { name: "desktop-1440", width: 1440, height: 900 },
    { name: "laptop-1024", width: 1024, height: 768 },
    { name: "tablet-768", width: 768, height: 1024 },
    { name: "mobile-390", width: 390, height: 844 },
  ];

  for (const vp of viewports) {
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      colorScheme: "light",
    });
    const page = await context.newPage();

    // Log in as doctor via synthetic demo button
    await page.goto("http://127.0.0.1:5173/login", { waitUntil: "networkidle" });
    await page.evaluate(() => localStorage.clear());
    await page.goto("http://127.0.0.1:5173/login", { waitUntil: "networkidle" });
    const docBtn = page.locator('button:has-text("Doctor")');
    if (await docBtn.isVisible()) {
      await docBtn.click();
      await page.waitForTimeout(200);
      await page.locator('button[type="submit"]').click();
      await page.waitForTimeout(1500);
    }

    // 1. Earnings page
    await page.goto("http://127.0.0.1:5173/doctor/earnings", { waitUntil: "networkidle" });
    await page.waitForTimeout(1000);
    await page.screenshot({
      path: `/home/mehedi/.gemini/antigravity-cli/brain/ffe3ff64-8cd8-48fa-bf81-e6ff48eb4a20/earnings-${vp.name}.png`,
      fullPage: false,
    });
    console.log(`Captured earnings-${vp.name}.png`);

    // 2. Settings page
    await page.goto("http://127.0.0.1:5173/doctor/settings", { waitUntil: "networkidle" });
    await page.waitForTimeout(1000);
    await page.screenshot({
      path: `/home/mehedi/.gemini/antigravity-cli/brain/ffe3ff64-8cd8-48fa-bf81-e6ff48eb4a20/settings-${vp.name}.png`,
      fullPage: false,
    });
    console.log(`Captured settings-${vp.name}.png`);

    await context.close();
  }

  await browser.close();
  console.log("Browser QA audit complete.");
}

main().catch((err) => {
  console.error("QA audit error:", err);
  process.exit(1);
});
