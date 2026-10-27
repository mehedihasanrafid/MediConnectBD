import type { AvailabilitySlot, FamilyMember, PublicDoctor, Review, SlotHold } from "../../../shared/types";

export interface DoctorSearchFilterState {
  search: string;
  specialty: string;
}

export interface DoctorDetailState {
  doctor: PublicDoctor | null;
  availability: { items: AvailabilitySlot[] } | null;
  reviews: Review[];
  hold: SlotHold | null;
  familyMembers: FamilyMember[];
  selectedFamilyMemberId: string;
}
