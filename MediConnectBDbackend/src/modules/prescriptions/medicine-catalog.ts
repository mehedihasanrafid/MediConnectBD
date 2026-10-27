/**
 * Curated Bangladesh & WHO essential medicine catalogue for doctor prescription autocomplete.
 */

export interface MedicineSuggestion {
  name: string;
  genericName: string;
  dosage: string;
  frequency: string;
  duration: string;
}

export const MEDICINE_CATALOG: readonly MedicineSuggestion[] = [
  {
    name: "Napa",
    genericName: "Paracetamol",
    dosage: "500mg",
    frequency: "1 tablet every 8 hours (after meals)",
    duration: "5 days",
  },
  {
    name: "Napa Extend",
    genericName: "Paracetamol (Sustained Release)",
    dosage: "665mg",
    frequency: "1 tablet twice daily",
    duration: "5 days",
  },
  {
    name: "Napa Extra",
    genericName: "Paracetamol + Caffeine",
    dosage: "500mg/65mg",
    frequency: "1 tablet twice daily",
    duration: "3 days",
  },
  {
    name: "Ace",
    genericName: "Paracetamol",
    dosage: "500mg",
    frequency: "1 tablet every 8 hours",
    duration: "5 days",
  },
  {
    name: "Seclo",
    genericName: "Omeprazole",
    dosage: "20mg",
    frequency: "1 capsule twice daily (30 min before meals)",
    duration: "14 days",
  },
  {
    name: "Sergel",
    genericName: "Esomeprazole",
    dosage: "20mg",
    frequency: "1 capsule twice daily (30 min before meals)",
    duration: "14 days",
  },
  {
    name: "Maxpro",
    genericName: "Esomeprazole",
    dosage: "20mg",
    frequency: "1 tablet twice daily (before meals)",
    duration: "14 days",
  },
  {
    name: "Pantonix",
    genericName: "Pantoprazole",
    dosage: "20mg",
    frequency: "1 tablet once daily (before breakfast)",
    duration: "14 days",
  },
  {
    name: "Fexo",
    genericName: "Fexofenadine",
    dosage: "120mg",
    frequency: "1 tablet once daily at night",
    duration: "7 days",
  },
  {
    name: "Alatrol",
    genericName: "Cetirizine",
    dosage: "10mg",
    frequency: "1 tablet once daily at bedtime",
    duration: "7 days",
  },
  {
    name: "Monas",
    genericName: "Montelukast",
    dosage: "10mg",
    frequency: "1 tablet once daily at bedtime",
    duration: "14 days",
  },
  {
    name: "Zimax",
    genericName: "Azithromycin",
    dosage: "500mg",
    frequency: "1 tablet once daily",
    duration: "3 days",
  },
  {
    name: "Moxacil",
    genericName: "Amoxicillin",
    dosage: "500mg",
    frequency: "1 capsule every 8 hours",
    duration: "7 days",
  },
  {
    name: "Cef-3",
    genericName: "Cefixime",
    dosage: "200mg",
    frequency: "1 capsule twice daily",
    duration: "7 days",
  },
  {
    name: "Ciprocin",
    genericName: "Ciprofloxacin",
    dosage: "500mg",
    frequency: "1 tablet twice daily",
    duration: "7 days",
  },
  {
    name: "Amdocal",
    genericName: "Amlodipine",
    dosage: "5mg",
    frequency: "1 tablet once daily in the morning",
    duration: "30 days",
  },
  {
    name: "Bizoran",
    genericName: "Amlodipine + Olmesartan",
    dosage: "5mg/20mg",
    frequency: "1 tablet once daily",
    duration: "30 days",
  },
  {
    name: "Comet",
    genericName: "Metformin",
    dosage: "500mg",
    frequency: "1 tablet twice daily (with meals)",
    duration: "30 days",
  },
  {
    name: "Roserva",
    genericName: "Rosuvastatin",
    dosage: "10mg",
    frequency: "1 tablet once daily at night",
    duration: "30 days",
  },
  {
    name: "Atova",
    genericName: "Atorvastatin",
    dosage: "10mg",
    frequency: "1 tablet once daily at night",
    duration: "30 days",
  },
  {
    name: "Coralcal-D",
    genericName: "Calcium + Vitamin D3",
    dosage: "500mg/200IU",
    frequency: "1 tablet once daily after lunch",
    duration: "30 days",
  },
  {
    name: "Bextram Gold",
    genericName: "Multivitamin & Multimineral",
    dosage: "1 tablet",
    frequency: "Once daily after meal",
    duration: "30 days",
  },
  {
    name: "Entacyd Plus",
    genericName: "Aluminium Hydroxide + Magnesium Hydroxide + Simethicone",
    dosage: "10ml",
    frequency: "2 teaspoons after meals and at bedtime",
    duration: "7 days",
  },
  {
    name: "Orsaline-N",
    genericName: "Oral Rehydration Salts (ORS)",
    dosage: "1 sachet in 500ml water",
    frequency: "After each loose stool",
    duration: "3 days",
  },
  {
    name: "Tofen",
    genericName: "Ketotifen",
    dosage: "1mg",
    frequency: "1 tablet twice daily",
    duration: "14 days",
  },
];

export function suggestMedicines(query: string, limit = 10): MedicineSuggestion[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return MEDICINE_CATALOG.slice(0, limit);
  }

  const prefixMatches: MedicineSuggestion[] = [];
  const substringMatches: MedicineSuggestion[] = [];

  for (const item of MEDICINE_CATALOG) {
    const nameLower = item.name.toLowerCase();
    const genericLower = item.genericName.toLowerCase();
    if (nameLower.startsWith(normalized) || genericLower.startsWith(normalized)) {
      prefixMatches.push(item);
    } else if (nameLower.includes(normalized) || genericLower.includes(normalized)) {
      substringMatches.push(item);
    }
  }

  return [...prefixMatches, ...substringMatches].slice(0, limit);
}
