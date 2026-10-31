import { describe, expect, it, vi } from "vitest";
import { renderToString } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { NotificationBell } from "../components/NotificationBell/NotificationBell";
import { NotificationsPage } from "../pages/NotificationsPage/NotificationsPage";
import { NotificationProvider } from "../context/NotificationContext";
import { formatDhakaNotificationTime, getRelativeNotificationTime } from "../utils/dateFormatter";

vi.mock("../../features/auth/AuthContext", () => ({
  useAuth: () => ({
    user: {
      id: "patient-1",
      email: "patient@mediconnect.example",
      firstName: "Demo",
      lastName: "Patient",
      roles: ["PATIENT"],
    },
    logout: vi.fn(),
    loading: false,
    login: vi.fn(),
    registerPatient: vi.fn(),
    registerDoctor: vi.fn(),
  }),
}));

describe("Notification Utilities", () => {
  it("formats ISO timestamps into Bangladesh local date & time (Asia/Dhaka)", () => {
    // 2026-10-31T07:20:00Z is 1:20 PM in Asia/Dhaka (+6)
    const formatted = formatDhakaNotificationTime("2026-10-31T07:20:00.000Z");
    expect(formatted).toContain("31 Oct 2026");
    expect(formatted).toMatch(/01:20\s*(pm|PM)/);
  });

  it("calculates relative time correctly", () => {
    const justNow = new Date().toISOString();
    expect(getRelativeNotificationTime(justNow)).toBe("Just now");
  });
});

describe("NotificationBell", () => {
  it("renders notification bell button with unread count badge in HTML", () => {
    const html = renderToString(
      <MemoryRouter>
        <NotificationProvider>
          <NotificationBell />
        </NotificationProvider>
      </MemoryRouter>,
    );

    expect(html).toContain("Notifications");
    expect(html).toContain("bellButton");
  });
});

describe("NotificationsPage", () => {
  it("renders Notification Center with category filters and search", () => {
    const html = renderToString(
      <MemoryRouter>
        <NotificationProvider>
          <NotificationsPage />
        </NotificationProvider>
      </MemoryRouter>,
    );

    expect(html).toContain("Notification Center");
    expect(html).toContain("Prescriptions");
    expect(html).toContain("Appointments &amp; Calls");
    expect(html).toContain("Payments");
    expect(html).toContain("Messages");
    expect(html).toContain("Search notifications...");
  });
});
