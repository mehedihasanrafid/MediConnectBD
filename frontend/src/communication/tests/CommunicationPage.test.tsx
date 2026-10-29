import { renderToString } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import type { PublicUser } from "../../shared/types";
import { CommunicationPage } from "../CommunicationPage";

let mockUser: PublicUser | null = {
  id: "patient-1",
  email: "patient.demo@mediconnect.example",
  roles: ["PATIENT"],
  firstName: "Demo",
  lastName: "Patient",
  status: "ACTIVE",
  patientProfileId: "patient-profile-1",
  doctorProfile: null,
};

vi.mock("../../features/auth/AuthContext", () => ({
  useAuth: () => ({
    user: mockUser,
    logout: vi.fn(),
    loading: false,
    login: vi.fn(),
    registerPatient: vi.fn(),
    registerDoctor: vi.fn(),
  }),
}));

describe("CommunicationPage Component", () => {
  it("renders consultation communication hub with patient conversation list and clinical chat", () => {
    mockUser = {
      id: "patient-1",
      email: "patient.demo@mediconnect.example",
      roles: ["PATIENT"],
      firstName: "Demo",
      lastName: "Patient",
      status: "ACTIVE",
      patientProfileId: "patient-profile-1",
      doctorProfile: null,
    };

    const html = renderToString(
      <MemoryRouter initialEntries={["/communication"]}>
        <CommunicationPage initialDrawerOpen={true} />
      </MemoryRouter>,
    );

    // Page header
    expect(html).toContain("Consultation Communication Hub");
    expect(html).toContain("Connected Care &amp; Telemedicine");

    // Quick Call Banner for active video consultation
    expect(html).toContain("Live Video Call Ready with Dr. Demo Doctor");
    expect(html).toContain("Join Video Room");

    // Conversation list
    expect(html).toContain("Dr. Demo Doctor");
    expect(html).toContain("Dr. Nusrat Jahan");
    expect(html).toContain("MediConnect Help Desk");
    expect(html).toContain("LIVE CALL");

    // Chat timeline & active messages
    expect(html).toContain("Hello Demo Patient, welcome to the consultation session.");
    expect(html).toContain("Digital Prescription #MCBD2026DEMO0001 has been issued");

    // Clinical Context Drawer
    expect(html).toContain("Clinical Context");
    expect(html).toContain("Linked Appointment");
    expect(html).toContain("MCBD2026DEMO0001");
  });

  it("renders doctor perspective with booked patients and clinical queue", () => {
    mockUser = {
      id: "doctor-1",
      email: "doctor.demo@mediconnect.example",
      roles: ["DOCTOR"],
      firstName: "Demo",
      lastName: "Doctor",
      status: "ACTIVE",
      patientProfileId: null,
      doctorProfile: {
        id: "doc-profile-1",
        applicationStatus: "APPROVED",
      },
    };

    const html = renderToString(
      <MemoryRouter initialEntries={["/communication"]}>
        <CommunicationPage initialDrawerOpen={true} />
      </MemoryRouter>,
    );

    // Doctor sees patient name in list and call banner
    expect(html).toContain("Demo Patient");
    expect(html).toContain("Tanvir Hasan");
    expect(html).toContain("Consultation Slot Active for Demo Patient");
    expect(html).toContain("Clinical Context");
  });
});
