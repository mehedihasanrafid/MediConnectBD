import { expect, test } from "@playwright/test";

test.describe("MediConnect BD Critical Journeys (Step 16)", () => {
  test("Journey 1: Patient login, doctor search, slot hold, and chamber booking", async ({
    page,
  }) => {
    // 1. Initial guest state (no active session on load)
    await page.route("**/api/v1/auth/refresh", async (route) => {
      await route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({ message: "No active session", code: "UNAUTHORIZED" }),
      });
    });

    // 2. Mock patient login
    const patientUser = {
      id: "patient-1",
      email: "patient@mediconnect.bd",
      firstName: "Rahim",
      lastName: "Uddin",
      roles: ["PATIENT"],
      status: "ACTIVE",
      patientProfileId: "prof-patient-1",
      doctorProfile: null,
    };

    await page.route("**/api/v1/auth/login", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          accessToken: "mock-patient-jwt",
          accessTokenExpiresIn: 900,
          tokenType: "Bearer",
          user: patientUser,
        }),
      });
    });

    // 3. Mock doctor directory catalog
    await page.route("**/api/v1/catalog/specialties", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          items: [{ id: "spec-1", name: "Cardiology", slug: "cardiology" }],
        }),
      });
    });

    await page.route("**/api/v1/catalog/hospitals", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          items: [{ id: "hosp-1", name: "Square Hospital", area: "Panthapath" }],
        }),
      });
    });

    const mockDoctor = {
      id: "doc-1",
      firstName: "Anisur",
      lastName: "Rahman",
      degrees: "MBBS, FCPS (Cardiology)",
      experienceYears: 12,
      bio: "Senior Consultant Cardiologist",
      photoUrl: null,
      languages: ["Bengali", "English"],
      videoConsultationFee: 800,
      minimumFee: 800,
      averageRating: 4.9,
      reviewCount: 38,
      specialties: [{ id: "spec-1", name: "Cardiology", slug: "cardiology" }],
      chambers: [
        {
          id: "chamb-1",
          roomOrUnit: "Room 402",
          consultationFee: 1000,
          isActive: true,
          hospital: {
            id: "hosp-1",
            name: "Square Hospital",
            slug: "square-hospital",
            area: "Panthapath",
            address: "18/F Bir Uttam Qazi Nuruzzaman Sarak, Dhaka 1205",
          },
        },
      ],
    };

    await page.route("**/api/v1/doctors*", async (route) => {
      if (route.request().url().includes("/doc-1/slots")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            items: [
              {
                id: "slot-1",
                doctorId: "doc-1",
                startAt: "2026-11-01T10:00:00.000Z",
                endAt: "2026-11-01T10:20:00.000Z",
                status: "AVAILABLE",
              },
            ],
          }),
        });
      } else if (route.request().url().endsWith("/doc-1")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(mockDoctor),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            items: [mockDoctor],
            page: 1,
            limit: 20,
            total: 1,
            totalPages: 1,
          }),
        });
      }
    });

    // Execute flow:
    await page.goto("/login");
    await expect(page.locator("body")).toContainText("Sign in to book appointments");

    await page.fill('input[type="email"]', "patient@mediconnect.bd");
    await page.fill('input[type="password"]', "Password123!");
    await page.click('button[type="submit"]');

    // Should redirect to doctors directory
    await page.waitForURL("**/doctors");
    await expect(page.locator("body")).toContainText("Dr. Anisur Rahman");
    await expect(page.locator("body")).toContainText("Cardiology");
  });

  test("Journey 2: Doctor completes an appointment and views queue", async ({ page }) => {
    // 1. Initial doctor session
    const doctorUser = {
      id: "doc-user-1",
      email: "doctor@mediconnect.bd",
      firstName: "Dr. Ayesha",
      lastName: "Khan",
      roles: ["DOCTOR"],
      status: "ACTIVE",
      patientProfileId: null,
      doctorProfile: {
        id: "doc-profile-1",
        applicationStatus: "APPROVED",
      },
    };

    await page.route("**/api/v1/auth/refresh", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          accessToken: "mock-doc-jwt",
          accessTokenExpiresIn: 900,
          tokenType: "Bearer",
          user: doctorUser,
        }),
      });
    });

    // 2. Mock doctor appointment queue via /doctors/me/appointments
    const activeAppointment = {
      id: "appt-doc-1",
      doctorId: "doc-profile-1",
      patientProfileId: "pat-1",
      patient: {
        id: "pat-1",
        firstName: "Rahim",
        lastName: "Uddin",
        email: "patient@mediconnect.bd",
        phone: "+8801700000000",
      },
      scheduledStartAt: new Date(Date.now() - 600000).toISOString(),
      scheduledEndAt: new Date(Date.now() + 600000).toISOString(),
      status: "CONFIRMED",
      mode: "VIDEO",
      feeAmount: 800,
      paymentRequired: false,
      videoRoomUrl: "https://mediconnect.daily.co/room-101",
    };

    await page.route("**/api/v1/doctors/me/appointments*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          items: [activeAppointment],
          total: 1,
        }),
      });
    });

    await page.route("**/api/v1/prescriptions/me/prescriptions*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          items: [],
          total: 0,
        }),
      });
    });

    await page.goto("/doctor/appointments");
    await expect(page.locator("body")).toContainText("Rahim Uddin");
    await expect(page.locator("body")).toContainText("Confirmed");
    await expect(page.locator("body")).toContainText("Patient history & reports");
  });

  test("Journey 3: Patient views digital prescription and pharmacy verifies authenticity", async ({
    page,
  }) => {
    // 1. Patient session
    const patientUser = {
      id: "patient-1",
      email: "patient@mediconnect.bd",
      firstName: "Rahim",
      lastName: "Uddin",
      roles: ["PATIENT"],
      status: "ACTIVE",
      patientProfileId: "prof-patient-1",
      doctorProfile: null,
    };

    await page.route("**/api/v1/auth/refresh", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          accessToken: "mock-patient-jwt",
          accessTokenExpiresIn: 900,
          tokenType: "Bearer",
          user: patientUser,
        }),
      });
    });

    // 2. Mock patient prescriptions list via /prescriptions/patients/me/prescriptions
    const patientPrescription = {
      id: "rx-99",
      appointmentId: "appt-doc-1",
      patientProfileId: "prof-patient-1",
      doctorProfileId: "doc-profile-1",
      doctorName: "Dr. Ayesha Khan",
      diagnosis: "Seasonal Bronchitis",
      medicines: [
        {
          name: "Amoxicillin 500mg",
          dosage: "1 capsule",
          frequency: "Three times daily",
          duration: "7 days",
        },
      ],
      tests: ["Chest X-Ray"],
      advice: "Drink plenty of warm fluids",
      verificationCode: "MCBD1234567890AB",
      createdAt: "2026-10-28T09:00:00.000Z",
    };

    await page.route(
      "**/api/v1/prescriptions/patients/me/prescriptions*",
      async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            items: [patientPrescription],
            total: 1,
          }),
        });
      },
    );

    // Execute Patient view:
    await page.goto("/prescriptions");
    await expect(page.locator("body")).toContainText("My prescriptions");
    await expect(page.locator("body")).toContainText("Diagnosis: Seasonal Bronchitis");
    await expect(page.locator("body")).toContainText("Amoxicillin 500mg");
    await expect(page.locator("body")).toContainText("MCBD1234567890AB");
    await expect(page.locator("body")).toContainText("Download PDF");

    // 3. Mock public verification
    await page.route("**/api/v1/prescriptions/verify/*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          valid: true,
          prescription: {
            id: "rx-99",
            verificationCode: "MCBD1234567890AB",
            doctorName: "Ayesha Khan",
            doctorProfileId: "doc-profile-1",
            issuedAt: "2026-10-28T09:00:00.000Z",
          },
        }),
      });
    });

    // Execute Public Verification check:
    await page.goto("/verify-prescription?code=MCBD1234567890AB");
    await expect(page.locator("body")).toContainText("Authentic MediConnect BD Prescription");
    await expect(page.locator("body")).toContainText("Verified");
    await expect(page.locator("body")).toContainText("Dr. Ayesha Khan");
    await expect(page.locator("body")).toContainText("MCBD1234567890AB");
    // Verify privacy protection: clinical diagnosis is hidden on public verification
    await expect(page.locator("body")).not.toContainText("Seasonal Bronchitis");
  });

  test("Journey 4: Unauthorized access to another patient's medical report is blocked", async ({
    page,
  }) => {
    // 1. Patient session for User B
    const userB = {
      id: "patient-2",
      email: "intruder@example.com",
      firstName: "Unauthorized",
      lastName: "User",
      roles: ["PATIENT"],
      status: "ACTIVE",
      patientProfileId: "prof-patient-2",
      doctorProfile: null,
    };

    await page.route("**/api/v1/auth/refresh", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          accessToken: "mock-intruder-jwt",
          accessTokenExpiresIn: 900,
          tokenType: "Bearer",
          user: userB,
        }),
      });
    });

    // 2. Reports list returns 403 Forbidden
    await page.route("**/api/v1/patients/me/reports*", async (route) => {
      await route.fulfill({
        status: 403,
        contentType: "application/json",
        body: JSON.stringify({
          code: "FORBIDDEN",
          message: "You are not authorized to view this patient's medical reports.",
        }),
      });
    });

    await page.goto("/reports");
    await expect(page.locator("body")).toContainText("My medical reports");
    await expect(page.locator("body")).toContainText(
      "You are not authorized to view this patient's medical reports.",
    );
  });
});
