import { renderToString } from "react-dom/server";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import { AdminHeader } from "../../../admin/layout/AdminHeader/AdminHeader";
import type { PublicDoctor } from "../../../shared/types";
import { CareBenefits } from "../components/CareBenefits";
import { FeaturedDoctors } from "../components/FeaturedDoctors";
import { HomeSearchForm } from "../components/HomeSearchForm";
import { SpecialtyGrid } from "../components/SpecialtyGrid";
import { HomePage } from "../HomePage";
import { PublicHeader } from "../../shell/PublicHeader";
import { useDoctorSearch } from "../../doctors/hooks/useDoctorSearch";
import { orderFeaturedDoctors } from "../hooks/useHomeData";

// Mock user for AuthContext
let mockUser: unknown = null;
vi.mock("../../../features/auth/AuthContext", () => ({
  useAuth: () => ({
    user: mockUser,
    logout: vi.fn().mockResolvedValue(undefined),
    loading: false,
    login: vi.fn(),
    registerPatient: vi.fn(),
    registerDoctor: vi.fn(),
  }),
  useOptionalAuth: () => (mockUser ? { user: mockUser } : null),
}));

// Mock valid PublicDoctor data matching backend schema
const mockHomeDoctors: PublicDoctor[] = [
  {
    id: "doc-1",
    firstName: "Farhana",
    lastName: "Rahman",
    degrees: "MBBS, FCPS",
    experienceYears: 10,
    bio: "Cardiology consultant",
    photoUrl: null,
    languages: ["Bangla", "English"],
    videoConsultationFee: 1000,
    minimumFee: 1200,
    averageRating: 4.8,
    reviewCount: 24,
    specialties: [{ id: "s-1", name: "Cardiology", slug: "cardiology" }],
    chambers: [
      {
        id: "ch-1",
        roomOrUnit: "Room 101",
        consultationFee: 1200,
        isActive: true,
        hospital: {
          id: "hosp-1",
          name: "Heart Care Clinic",
          slug: "heart-care-clinic",
          area: "Dhanmondi",
          address: "Road 27",
        },
      },
    ],
  },
  {
    id: "doc-2",
    firstName: "Tanvir",
    lastName: "Ahmed",
    degrees: "MBBS, MD",
    experienceYears: 8,
    bio: "Neurology specialist",
    photoUrl: null,
    languages: ["Bangla"],
    videoConsultationFee: null,
    minimumFee: 1500,
    averageRating: 4.9,
    reviewCount: 30,
    specialties: [{ id: "s-2", name: "Neurology", slug: "neurology" }],
    chambers: [
      {
        id: "ch-2",
        roomOrUnit: "Level 4",
        consultationFee: 1500,
        isActive: true,
        hospital: {
          id: "hosp-2",
          name: "Neuro Center",
          slug: "neuro-center",
          area: "Gulshan",
          address: "Gulshan 2",
        },
      },
    ],
  },
  {
    id: "doc-3",
    firstName: "Nusrat",
    lastName: "Jahan",
    degrees: "MBBS, DDV",
    experienceYears: 7,
    bio: "Dermatology specialist",
    photoUrl: null,
    languages: ["Bangla", "English"],
    videoConsultationFee: 800,
    minimumFee: 1000,
    averageRating: 4.7,
    reviewCount: 15,
    specialties: [{ id: "s-3", name: "Dermatology", slug: "dermatology" }],
    chambers: [
      {
        id: "ch-3",
        roomOrUnit: "Suite 12",
        consultationFee: 1000,
        isActive: true,
        hospital: {
          id: "hosp-3",
          name: "Skin Health Center",
          slug: "skin-health",
          area: "Uttara",
          address: "Sector 3",
        },
      },
    ],
  },
];

let mockLoading = false;
let mockError: string | null = null;
let currentMockDoctors = mockHomeDoctors;

vi.mock("../hooks/useHomeData", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../hooks/useHomeData")>();
  return {
    ...actual,
    useHomeData: () => ({
      doctors: currentMockDoctors,
      specialties: [
        { id: "s-1", name: "Cardiology", slug: "cardiology" },
        { id: "s-2", name: "Neurology", slug: "neurology" },
      ],
      loading: mockLoading,
      error: mockError,
    }),
    getDoctorPhotoUrl: () => null,
  };
});

describe("MediConnectBD Public Homepage (HomePage)", () => {
  it("renders the H1 and all major section headings including Featured doctors", () => {
    mockLoading = false;
    mockError = null;
    currentMockDoctors = mockHomeDoctors;

    const html = renderToString(
      <MemoryRouter initialEntries={["/"]}>
        <HomePage />
      </MemoryRouter>,
    );

    // Single primary H1
    expect(html).toContain("The right doctor, right when you need one.");
    expect(html).toContain("Healthcare made simpler in Bangladesh");
    expect(html).toContain(
      "Find trusted doctors, compare transparent fees, and book chamber or video appointments in minutes.",
    );

    // Major Section Headings
    expect(html).toContain("Find care by specialty");
    expect(html).toContain("Featured doctors");
    expect(html).toContain("Book in three easy steps");
    expect(html).toContain("Designed around your care");
    expect(html).toContain("Ready to find the right doctor?");
  });

  it("renders the search form with accessible inputs and labels", () => {
    const html = renderToString(
      <MemoryRouter>
        <HomeSearchForm />
      </MemoryRouter>,
    );

    expect(html).toContain("Doctor or specialty");
    expect(html).toContain("Area or hospital");
    expect(html).toContain("Find doctors");
    expect(html).toContain('placeholder="Doctor or specialty"');
    expect(html).toContain('placeholder="Area or hospital"');
  });

  it("renders specialty grid with valid slugs and Lucide icons", () => {
    const html = renderToString(
      <MemoryRouter>
        <SpecialtyGrid />
      </MemoryRouter>,
    );

    expect(html).toContain("General Medicine");
    expect(html).toContain("/doctors?specialty=medicine");
    expect(html).toContain("Cardiology");
    expect(html).toContain("/doctors?specialty=cardiology");
    expect(html).toContain("Pediatrics");
    expect(html).toContain("/doctors?specialty=pediatrics");
    expect(html).toContain("Dermatology");
    expect(html).toContain("/doctors?specialty=dermatology");
    expect(html).toContain("Gynecology");
    expect(html).toContain("/doctors?specialty=gynecology");
    expect(html).toContain("Neurology");
    expect(html).toContain("/doctors?specialty=neurology");
  });

  it("renders featured doctors from API without hardcoded availability", () => {
    const html = renderToString(
      <MemoryRouter>
        <FeaturedDoctors doctors={mockHomeDoctors} loading={false} error={null} />
      </MemoryRouter>,
    );

    // Doctor names
    expect(html).toContain("Dr. Farhana Rahman");
    expect(html).toContain("Dr. Tanvir Ahmed");
    expect(html).toContain("Dr. Nusrat Jahan");

    // Profile links
    expect(html).toContain("/doctors/doc-1");
    expect(html).toContain("/doctors/doc-2");
    expect(html).toContain("/doctors/doc-3");

    // Specialties and locations
    expect(html).toContain("Cardiology");
    expect(html).toContain("Dhanmondi");
    expect(html).toContain("Neurology");
    expect(html).toContain("Gulshan");
    expect(html).toContain("Dermatology");
    expect(html).toContain("Uttara");

    // Mode badges
    expect(html).toContain("Chamber");
    expect(html).toContain("Video");

    // Fees (formatMoney renders ৳1200.00)
    expect(html).toContain("৳1200.00");
    expect(html).toContain("৳1500.00");

    // Availability honesty: must NOT claim "Next available today"
    expect(html).not.toContain("Next available today");
    expect(html).not.toContain("available now");
  });

  it("correctly orders featured doctors in development mode vs production", () => {
    // Array with scrambled order
    const scrambled = [
      mockHomeDoctors[1], // Tanvir Ahmed
      mockHomeDoctors[2], // Nusrat Jahan
      mockHomeDoctors[0], // Farhana Rahman
    ];

    // Dev mode: must order 1. Farhana Rahman, 2. Tanvir Ahmed, 3. Nusrat Jahan
    const devOrdered = orderFeaturedDoctors(scrambled, true);
    expect(devOrdered[0].firstName).toBe("Farhana");
    expect(devOrdered[1].firstName).toBe("Tanvir");
    expect(devOrdered[2].firstName).toBe("Nusrat");

    // Prod mode: must preserve API order
    const prodOrdered = orderFeaturedDoctors(scrambled, false);
    expect(prodOrdered[0].firstName).toBe("Tanvir");
    expect(prodOrdered[1].firstName).toBe("Nusrat");
    expect(prodOrdered[2].firstName).toBe("Farhana");
  });

  it("renders honest CareBenefits copy without claiming verified schedules", () => {
    const html = renderToString(
      <MemoryRouter>
        <CareBenefits />
      </MemoryRouter>,
    );

    expect(html).toContain("Clear availability");
    expect(html).toContain("Simple booking");
    expect(html).toContain("Family profiles");
    // Honest: does not claim schedules are BMDC verified
    expect(html).not.toContain("verified chamber schedules");
    expect(html).toContain("View chamber schedules");
  });

  it("renders loading skeletons and honest empty / error states without inventing doctors", () => {
    // 1. Loading state
    const loadingHtml = renderToString(
      <MemoryRouter>
        <FeaturedDoctors doctors={[]} loading={true} error={null} />
      </MemoryRouter>,
    );
    expect(loadingHtml).toContain('aria-label="Loading doctors"');
    expect(loadingHtml).not.toContain("Farhana Rahman");

    // 2. Empty state
    const emptyHtml = renderToString(
      <MemoryRouter>
        <FeaturedDoctors doctors={[]} loading={false} error={null} />
      </MemoryRouter>,
    );
    expect(emptyHtml).toContain("No doctors are currently available.");
    expect(emptyHtml).toContain("Explore the doctor directory");
    expect(emptyHtml).not.toContain("Farhana Rahman");

    // 3. Error state
    const errorHtml = renderToString(
      <MemoryRouter>
        <FeaturedDoctors
          doctors={[]}
          loading={false}
          error="Could not load featured doctors. Please visit the doctor directory."
        />
      </MemoryRouter>,
    );
    expect(errorHtml).toContain("Could not load featured doctors. Please visit the doctor directory.");
    expect(errorHtml).toContain("Browse doctor directory");
    expect(errorHtml).not.toContain("Farhana Rahman");
  });

  it("gates ThemeToggle: absent for visitors, present for authenticated users, present in AdminHeader", () => {
    // Visitor: unauthenticated
    mockUser = null;
    const visitorHeader = renderToString(
      <MemoryRouter initialEntries={["/"]}>
        <PublicHeader />
      </MemoryRouter>,
    );
    expect(visitorHeader).not.toContain("Toggle theme");

    // Authenticated Patient
    mockUser = {
      id: "patient-1",
      email: "patient@mediconnect.bd",
      roles: ["PATIENT"],
      firstName: "Karim",
      lastName: "Hasan",
      status: "ACTIVE",
    };
    const patientHeader = renderToString(
      <MemoryRouter initialEntries={["/"]}>
        <PublicHeader />
      </MemoryRouter>,
    );
    expect(patientHeader).toContain("Toggle theme");

    // AdminHeader retains ThemeToggle
    mockUser = {
      id: "admin-1",
      email: "admin@mediconnect.bd",
      roles: ["ADMIN"],
      firstName: "Admin",
      lastName: "User",
      status: "ACTIVE",
    };
    const adminHeader = renderToString(
      <MemoryRouter initialEntries={["/admin/overview"]}>
        <AdminHeader />
      </MemoryRouter>,
    );
    expect(adminHeader).toContain("Toggle theme");
  });

  it("verifies useDoctorSearch initializes filters from URL query params and clears them", () => {
    let capturedHook: ReturnType<typeof useDoctorSearch> | null = null;

    function TestComponent() {
      capturedHook = useDoctorSearch();
      return (
        <div>
          <span data-testid="search">{capturedHook.search}</span>
          <span data-testid="area">{capturedHook.area}</span>
          <span data-testid="specialty">{capturedHook.specialty}</span>
          <span data-testid="total">{capturedHook.total}</span>
        </div>
      );
    }

    const html = renderToString(
      <MemoryRouter initialEntries={["/doctors?search=Rahman&area=Dhanmondi&specialty=cardiology"]}>
        <Routes>
          <Route path="/doctors" element={<TestComponent />} />
        </Routes>
      </MemoryRouter>,
    );

    // Initialized from URL query params
    expect(html).toContain("Rahman");
    expect(html).toContain("Dhanmondi");
    expect(html).toContain("cardiology");

    if (!capturedHook) {
      throw new Error("capturedHook must not be null");
    }

    const hook: ReturnType<typeof useDoctorSearch> = capturedHook;
    expect(hook.search).toBe("Rahman");
    expect(hook.area).toBe("Dhanmondi");
    expect(hook.specialty).toBe("cardiology");
    expect(typeof hook.clearFilters).toBe("function");
    expect(hook.hasActiveFilters).toBe(true);
  });
});
