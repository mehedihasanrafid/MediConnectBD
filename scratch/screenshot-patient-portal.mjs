import { chromium } from "/home/mehedi/Desktop/MediConnectBD/frontend/node_modules/playwright/index.mjs";

const ARTIFACT_DIR = "/home/mehedi/.gemini/antigravity-cli/brain/ffe3ff64-8cd8-48fa-bf81-e6ff48eb4a20";

async function main() {
  const browser = await chromium.launch({ headless: true });

  // 1. Desktop Context (1440x900)
  const desktopContext = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    colorScheme: "dark",
  });
  const page = await desktopContext.newPage();

  // Log in as patient
  await page.goto("http://127.0.0.1:5174/login", { waitUntil: "networkidle" });
  await page.evaluate(() => localStorage.clear());
  await page.goto("http://127.0.0.1:5174/login", { waitUntil: "networkidle" });
  await page.locator('button:has-text("Patient")').click();
  await page.waitForTimeout(200);
  await page.locator('button[type="submit"]').click();
  await page.waitForTimeout(1500);

  // 1. Appointments Page
  await page.goto("http://127.0.0.1:5174/appointments", { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);
  await page.screenshot({
    path: `${ARTIFACT_DIR}/preview-patient-appointments-widescreen.png`,
    fullPage: false,
  });
  console.log("Captured preview-patient-appointments-widescreen.png");

  // 2. Prescriptions Page
  await page.goto("http://127.0.0.1:5174/prescriptions", { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);
  await page.screenshot({
    path: `${ARTIFACT_DIR}/preview-patient-prescriptions-widescreen.png`,
    fullPage: false,
  });
  console.log("Captured preview-patient-prescriptions-widescreen.png");

  // 3. Medical Reports Page (Default view)
  await page.goto("http://127.0.0.1:5174/reports", { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);
  await page.screenshot({
    path: `${ARTIFACT_DIR}/preview-patient-reports-widescreen.png`,
    fullPage: false,
  });
  console.log("Captured preview-patient-reports-widescreen.png");

  // 4. Medical Reports Page (Upload panel toggled)
  const uploadToggleBtn = page.locator('button:has-text("Upload Diagnostic Report")').first();
  if (await uploadToggleBtn.isVisible()) {
    await uploadToggleBtn.click();
    await page.waitForTimeout(500);
    await page.screenshot({
      path: `${ARTIFACT_DIR}/preview-patient-reports-upload-panel.png`,
      fullPage: false,
    });
    console.log("Captured preview-patient-reports-upload-panel.png");
  }

  // 5. Family Members Page
  await page.goto("http://127.0.0.1:5174/family-members", { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);
  await page.screenshot({
    path: `${ARTIFACT_DIR}/preview-patient-family-members-widescreen.png`,
    fullPage: false,
  });
  console.log("Captured preview-patient-family-members-widescreen.png");

  await desktopContext.close();

  // 6. Mobile Context (375x812)
  const mobileContext = await browser.newContext({
    viewport: { width: 375, height: 812 },
    isMobile: true,
    hasTouch: true,
    colorScheme: "dark",
  });
  const mobilePage = await mobileContext.newPage();

  // Log in as patient
  await mobilePage.goto("http://127.0.0.1:5174/login", { waitUntil: "networkidle" });
  await mobilePage.evaluate(() => localStorage.clear());
  await mobilePage.goto("http://127.0.0.1:5174/login", { waitUntil: "networkidle" });
  await mobilePage.locator('button:has-text("Patient")').click();
  await mobilePage.waitForTimeout(200);
  await mobilePage.locator('button[type="submit"]').click();
  await mobilePage.waitForTimeout(1500);

  // Mobile Appointments
  await mobilePage.goto("http://127.0.0.1:5174/appointments", { waitUntil: "networkidle" });
  await mobilePage.waitForTimeout(1000);
  await mobilePage.screenshot({
    path: `${ARTIFACT_DIR}/mobile-patient-appointments.png`,
    fullPage: false,
  });
  console.log("Captured mobile-patient-appointments.png");

  // Mobile Reports
  await mobilePage.goto("http://127.0.0.1:5174/reports", { waitUntil: "networkidle" });
  await mobilePage.waitForTimeout(1000);
  await mobilePage.screenshot({
    path: `${ARTIFACT_DIR}/mobile-patient-reports.png`,
    fullPage: false,
  });
  console.log("Captured mobile-patient-reports.png");

  await mobileContext.close();
  await browser.close();
}

main().catch((err) => {
  console.error("Error capturing screenshots:", err);
  process.exit(1);
});
