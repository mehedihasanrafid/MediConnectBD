import { chromium } from "/home/mehedi/Desktop/MediConnectBD/frontend/node_modules/playwright/index.mjs";

const ARTIFACT_DIR = "/home/mehedi/.gemini/antigravity-cli/brain/ffe3ff64-8cd8-48fa-bf81-e6ff48eb4a20";

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
    colorScheme: "dark",
  });

  // Log in as patient
  await page.goto("http://127.0.0.1:5173/login", { waitUntil: "networkidle" });
  await page.locator('button:has-text("Patient")').click();
  await page.locator('button[type="submit"]').click();
  await page.waitForTimeout(1000);

  // Navigate to Appointments
  await page.goto("http://127.0.0.1:5173/appointments", { waitUntil: "networkidle" });
  await page.waitForTimeout(500);

  // Click Join video session
  const joinBtn = page.locator('button:has-text("Join video session")').first();
  if (await joinBtn.isVisible()) {
    await joinBtn.click();

    // Wait for the Pre-Call Lobby and enter room
    const enterRoomBtn = page.locator('button:has-text("Enter Consultation Room")').first();
    await enterRoomBtn.waitFor({ state: "visible", timeout: 10000 });
    await enterRoomBtn.click();
    await page.waitForTimeout(2500);

    // Click "Clinical Split-View"
    const splitBtn = page.locator('button:has-text("Clinical Split-View")').first();
    if (await splitBtn.isVisible()) {
      await splitBtn.click();
      await page.waitForTimeout(1000);

      // Select "Fast-RX Protocols" tab to show protocol bundles
      const fastRxTab = page.locator('button:has-text("Fast-RX Protocols")').first();
      if (await fastRxTab.isVisible()) {
        await fastRxTab.click();
        await page.waitForTimeout(500);
      }

      await page.screenshot({
        path: `${ARTIFACT_DIR}/preview-video-clinical-splitview.png`,
        fullPage: false,
      });
      console.log("Captured preview-video-clinical-splitview.png");
    }
  }

  await browser.close();
}

main().catch(console.error);
