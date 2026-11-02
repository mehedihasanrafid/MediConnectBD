import { chromium } from "/home/mehedi/Desktop/MediConnectBD/frontend/node_modules/playwright/index.mjs";

async function main() {
  const browser = await chromium.launch({ headless: true });

  // 1. Desktop Viewport
  const desktopContext = await browser.newContext({
    viewport: { width: 1440, height: 960 },
    colorScheme: "dark",
  });
  const desktopPage = await desktopContext.newPage();

  // Log in as doctor
  await desktopPage.goto("http://127.0.0.1:5174/login", { waitUntil: "networkidle" });
  await desktopPage.evaluate(() => localStorage.clear());
  await desktopPage.goto("http://127.0.0.1:5174/login", { waitUntil: "networkidle" });
  await desktopPage.locator('button:has-text("Doctor")').click();
  await desktopPage.waitForTimeout(200);
  await desktopPage.locator('button[type="submit"]').click();
  await desktopPage.waitForTimeout(1500);

  // Navigate to Doctor Dashboard
  await desktopPage.goto("http://127.0.0.1:5174/doctor", { waitUntil: "networkidle" });
  await desktopPage.waitForTimeout(1200);

  // 1. Screenshot Desktop Command Center Overview
  await desktopPage.screenshot({
    path: "/home/mehedi/.gemini/antigravity-cli/brain/ffe3ff64-8cd8-48fa-bf81-e6ff48eb4a20/preview-doctor-dashboard-phase2.png",
    fullPage: true,
  });
  console.log("Captured preview-doctor-dashboard-phase2.png");

  // 2. Open Fast-RX Protocol Modal
  const fastRxBtn = desktopPage.locator('button:has-text("Respiratory Viral Flu Bundle")').first();
  if (await fastRxBtn.isVisible()) {
    await fastRxBtn.click();
    await desktopPage.waitForTimeout(600);
    await desktopPage.screenshot({
      path: "/home/mehedi/.gemini/antigravity-cli/brain/ffe3ff64-8cd8-48fa-bf81-e6ff48eb4a20/preview-doctor-fastrx-modal.png",
      fullPage: false,
    });
    console.log("Captured preview-doctor-fastrx-modal.png");
    // Close modal
    await desktopPage.locator('button[aria-label="Close modal"]').click();
    await desktopPage.waitForTimeout(300);
  }

  // 3. Open Emergency Blackout Modal
  const emergencyBtn = desktopPage.locator('button:has-text("Emergency Chamber Blackout")').first();
  if (await emergencyBtn.isVisible()) {
    await emergencyBtn.click();
    await desktopPage.waitForTimeout(600);
    await desktopPage.screenshot({
      path: "/home/mehedi/.gemini/antigravity-cli/brain/ffe3ff64-8cd8-48fa-bf81-e6ff48eb4a20/preview-doctor-emergency-blackout.png",
      fullPage: false,
    });
    console.log("Captured preview-doctor-emergency-blackout.png");
    // Close modal
    await desktopPage.locator('button[aria-label="Close modal"]').click();
    await desktopPage.waitForTimeout(300);
  }

  // 4. Mobile Viewport (iPhone 13 / 375x812)
  const mobileContext = await browser.newContext({
    viewport: { width: 375, height: 812 },
    colorScheme: "dark",
    isMobile: true,
    hasTouch: true,
  });
  const mobilePage = await mobileContext.newPage();

  // Clean login on mobile
  await mobilePage.goto("http://127.0.0.1:5174/login", { waitUntil: "networkidle" });
  await mobilePage.evaluate(() => localStorage.clear());
  await mobilePage.goto("http://127.0.0.1:5174/login", { waitUntil: "networkidle" });
  await mobilePage.locator('button:has-text("Doctor")').click();
  await mobilePage.waitForTimeout(200);
  await mobilePage.locator('button[type="submit"]').click();
  await mobilePage.waitForTimeout(1500);

  await mobilePage.goto("http://127.0.0.1:5174/doctor", { waitUntil: "networkidle" });
  await mobilePage.waitForTimeout(1200);

  const scrollWidth = await mobilePage.evaluate(() => document.documentElement.scrollWidth);
  const clientWidth = await mobilePage.evaluate(() => document.documentElement.clientWidth);
  console.log(`Mobile Phase 2 dashboard: scrollWidth=${scrollWidth}, clientWidth=${clientWidth}, overflow=${scrollWidth > clientWidth}`);

  await mobilePage.screenshot({
    path: "/home/mehedi/.gemini/antigravity-cli/brain/ffe3ff64-8cd8-48fa-bf81-e6ff48eb4a20/mobile-doctor-dashboard-phase2.png",
    fullPage: false,
  });
  console.log("Captured mobile-doctor-dashboard-phase2.png");

  await browser.close();
}

main().catch(console.error);
