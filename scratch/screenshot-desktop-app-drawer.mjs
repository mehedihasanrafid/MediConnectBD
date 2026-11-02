import { chromium } from "/home/mehedi/Desktop/MediConnectBD/frontend/node_modules/playwright/index.mjs";

async function main() {
  const browser = await chromium.launch({ headless: true });

  const desktopContext = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    colorScheme: "dark",
  });
  const page = await desktopContext.newPage();

  // Log in as doctor
  await page.goto("http://127.0.0.1:5174/login", { waitUntil: "networkidle" });
  await page.evaluate(() => localStorage.clear());
  await page.goto("http://127.0.0.1:5174/login", { waitUntil: "networkidle" });
  await page.locator('button:has-text("Doctor")').click();
  await page.waitForTimeout(200);
  await page.locator('button[type="submit"]').click();
  await page.waitForTimeout(1500);

  // Navigate to Doctor Dashboard
  await page.goto("http://127.0.0.1:5174/doctor", { waitUntil: "networkidle" });
  await page.waitForTimeout(1200);

  // Trigger Contextual Drawer by inspecting state or clicking
  // Let's see if we can trigger the drawer
  await page.evaluate(() => {
    // Dispatch a custom click or call setInspectingPatientId if available
    const appt = window.__LAST_APPT__;
  });

  // Let's create an appointment or trigger the drawer directly
  // The drawer opens when inspectingPatientId is not null.
  // In the DOM, we can test opening it or check if an appointment exists.
  // Let's see if there are any appointments in /doctor/appointments
  await page.goto("http://127.0.0.1:5174/doctor/appointments", { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);
  await page.screenshot({
    path: "/home/mehedi/.gemini/antigravity-cli/brain/ffe3ff64-8cd8-48fa-bf81-e6ff48eb4a20/preview-doctor-appointments-queue.png",
    fullPage: false,
  });

  await browser.close();
}

main().catch(console.error);
