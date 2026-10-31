/**
 * Captures verification screenshots of the In-App Notification System.
 */
const path = require("path");
const { chromium } = require(path.join(__dirname, "../frontend/node_modules/@playwright/test"));

const ARTIFACT_DIR = "/home/mehedi/.gemini/antigravity-cli/brain/ffe3ff64-8cd8-48fa-bf81-e6ff48eb4a20";
const BASE_URL = "http://127.0.0.1:5174";

async function run() {
  const browser = await chromium.launch({ headless: true });

  // 1. Desktop Test - Patient Session
  console.log("Launching desktop browser...");
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });
  const page = await context.newPage();

  // Go to login page
  console.log("Navigating to login...");
  await page.goto(`${BASE_URL}/login`);
  await page.waitForLoadState("networkidle");

  // Log in as Demo Patient
  await page.fill('input[type="email"]', "patient.demo@mediconnect.example");
  await page.fill('input[type="password"]', "#king123");
  await page.click('button[type="submit"]');

  // Wait for navigation
  await page.waitForTimeout(1500);

  // Take screenshot of header with notification bell & badge before click
  console.log("Capturing bell with unread badge...");
  await page.screenshot({
    path: path.join(ARTIFACT_DIR, "preview-notification-bell-badge.png"),
    fullPage: false,
  });

  // Click the notification bell to open tray
  console.log("Opening notification popover tray...");
  const bellButton = page.locator('button[title*="unread notifications"], button[aria-label*="Notifications"]').first();
  await bellButton.click();
  await page.waitForTimeout(600);

  // Capture open popover tray
  console.log("Capturing notification popover tray...");
  await page.screenshot({
    path: path.join(ARTIFACT_DIR, "preview-notification-tray.png"),
    fullPage: false,
  });

  // Navigate to /notifications page
  console.log("Navigating to /notifications...");
  await page.goto(`${BASE_URL}/notifications`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(800);

  // Expand the first details button if available
  const detailsBtn = page.locator("button:has-text('View Clinical Details')").first();
  if (await detailsBtn.isVisible()) {
    await detailsBtn.click();
    await page.waitForTimeout(300);
  }

  // Capture full Notification Center page
  console.log("Capturing /notifications page...");
  await page.screenshot({
    path: path.join(ARTIFACT_DIR, "preview-notifications-page.png"),
    fullPage: true,
  });

  await context.close();

  // 2. Mobile View Test (375x812 - iPhone X/13/14 size)
  console.log("Launching mobile viewport...");
  const mobileContext = await browser.newContext({
    viewport: { width: 375, height: 812 },
    isMobile: true,
  });
  const mobilePage = await mobileContext.newPage();

  await mobilePage.goto(`${BASE_URL}/login`);
  await mobilePage.waitForLoadState("networkidle");
  await mobilePage.fill('input[type="email"]', "patient.demo@mediconnect.example");
  await mobilePage.fill('input[type="password"]', "#king123");
  await mobilePage.click('button[type="submit"]');
  await mobilePage.waitForTimeout(1500);

  // Open bell on mobile
  const mobileBell = mobilePage.locator('button[aria-label*="Notifications"]').first();
  if (await mobileBell.isVisible()) {
    await mobileBell.click();
    await mobilePage.waitForTimeout(600);
  }

  console.log("Capturing mobile notification tray...");
  await mobilePage.screenshot({
    path: path.join(ARTIFACT_DIR, "mobile-notification-tray.png"),
    fullPage: false,
  });

  // Check mobile /notifications page
  await mobilePage.goto(`${BASE_URL}/notifications`);
  await mobilePage.waitForLoadState("networkidle");
  await mobilePage.waitForTimeout(600);

  // Verify horizontal overflow
  const scrollWidth = await mobilePage.evaluate(() => document.documentElement.scrollWidth);
  const clientWidth = await mobilePage.evaluate(() => document.documentElement.clientWidth);
  console.log(`Mobile dimensions check: scrollWidth=${scrollWidth}, clientWidth=${clientWidth}`);
  if (scrollWidth > clientWidth) {
    console.warn(`WARNING: Horizontal overflow detected on mobile: ${scrollWidth} > ${clientWidth}`);
  } else {
    console.log("PASS: Zero horizontal overflow on mobile!");
  }

  console.log("Capturing mobile /notifications page...");
  await mobilePage.screenshot({
    path: path.join(ARTIFACT_DIR, "mobile-notifications-page.png"),
    fullPage: true,
  });

  await mobileContext.close();
  await browser.close();
  console.log("Screenshots captured successfully!");
}

run().catch((err) => {
  console.error("Screenshot error:", err);
  process.exit(1);
});
