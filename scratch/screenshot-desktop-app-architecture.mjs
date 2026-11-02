import { chromium } from "/home/mehedi/Desktop/MediConnectBD/frontend/node_modules/playwright/index.mjs";

async function main() {
  const browser = await chromium.launch({ headless: true });

  // 1. Desktop Viewport (1440x900)
  const desktopContext = await browser.newContext({
    viewport: { width: 1440, height: 900 },
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

  // 1. Tab 1: Today's Queue (Full Canvas)
  await desktopPage.screenshot({
    path: "/home/mehedi/.gemini/antigravity-cli/brain/ffe3ff64-8cd8-48fa-bf81-e6ff48eb4a20/preview-doctor-desktop-tab-queue.png",
    fullPage: false,
  });
  console.log("Captured preview-doctor-desktop-tab-queue.png");

  // 2. Open Contextual Right Inspector Drawer
  const historyBtn = desktopPage.locator('button:has-text("Clinical History & Reports")').first();
  if (await historyBtn.isVisible()) {
    await historyBtn.click();
    await desktopPage.waitForTimeout(800);
    await desktopPage.screenshot({
      path: "/home/mehedi/.gemini/antigravity-cli/brain/ffe3ff64-8cd8-48fa-bf81-e6ff48eb4a20/preview-doctor-contextual-drawer.png",
      fullPage: false,
    });
    console.log("Captured preview-doctor-contextual-drawer.png");
    // Close drawer
    await desktopPage.locator('button[aria-label="Close patient inspector"]').click();
    await desktopPage.waitForTimeout(300);
  }

  // 3. Tab 2: Practice Analytics & Revenue
  const analyticsTabBtn = desktopPage.locator('button:has-text("Practice Analytics")').first();
  if (await analyticsTabBtn.isVisible()) {
    await analyticsTabBtn.click();
    await desktopPage.waitForTimeout(600);
    await desktopPage.screenshot({
      path: "/home/mehedi/.gemini/antigravity-cli/brain/ffe3ff64-8cd8-48fa-bf81-e6ff48eb4a20/preview-doctor-desktop-tab-analytics.png",
      fullPage: false,
    });
    console.log("Captured preview-doctor-desktop-tab-analytics.png");
  }

  // 4. Tab 3: Weekly Schedule & Profile
  const scheduleTabBtn = desktopPage.locator('button:has-text("Weekly Schedule")').first();
  if (await scheduleTabBtn.isVisible()) {
    await scheduleTabBtn.click();
    await desktopPage.waitForTimeout(600);
    await desktopPage.screenshot({
      path: "/home/mehedi/.gemini/antigravity-cli/brain/ffe3ff64-8cd8-48fa-bf81-e6ff48eb4a20/preview-doctor-desktop-tab-schedule.png",
      fullPage: false,
    });
    console.log("Captured preview-doctor-desktop-tab-schedule.png");
  }

  // 5. Mobile Viewport (iPhone 13 / 375x812)
  const mobileContext = await browser.newContext({
    viewport: { width: 375, height: 812 },
    colorScheme: "dark",
    isMobile: true,
    hasTouch: true,
  });
  const mobilePage = await mobileContext.newPage();

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
  console.log(`Mobile desktop app: scrollWidth=${scrollWidth}, clientWidth=${clientWidth}, overflow=${scrollWidth > clientWidth}`);

  await mobilePage.screenshot({
    path: "/home/mehedi/.gemini/antigravity-cli/brain/ffe3ff64-8cd8-48fa-bf81-e6ff48eb4a20/mobile-doctor-desktop-app.png",
    fullPage: false,
  });
  console.log("Captured mobile-doctor-desktop-app.png");

  await browser.close();
}

main().catch(console.error);
