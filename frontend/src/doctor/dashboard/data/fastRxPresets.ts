/**
 * Curated clinical protocol preset bundles (Fast-RX) for Bangladesh doctors.
 * Covers standard WHO and Bangladesh national treatment guidelines for common outpatient consultations.
 */

export interface FastRxMedicineItem {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instruction: string;
}

export interface FastRxBundle {
  id: string;
  title: string;
  category: string;
  diagnosis: string;
  medicines: FastRxMedicineItem[];
  advice: string;
  tests?: string[];
}

export const FAST_RX_PRESET_BUNDLES: FastRxBundle[] = [
  {
    id: "bundle-flu",
    title: "Respiratory Viral Flu Bundle",
    category: "Internal Medicine / Pulmonology",
    diagnosis: "Acute Upper Respiratory Tract Infection (Viral Pharyngitis)",
    medicines: [
      {
        name: "Napa Extra",
        dosage: "500mg + 65mg",
        frequency: "1 tablet every 8 hours",
        duration: "5 days",
        instruction: "After meals, for fever or body ache",
      },
      {
        name: "Montair 10",
        dosage: "10mg",
        frequency: "1 tablet at bedtime",
        duration: "14 days",
        instruction: "At night with water",
      },
      {
        name: "Fexo 120",
        dosage: "120mg",
        frequency: "1 tablet once daily",
        duration: "7 days",
        instruction: "Morning after meal for rhinorrhea",
      },
    ],
    advice:
      "Warm water steam inhalation twice daily. Adequate hydration (>2.5L warm fluid). Rest and avoid cold beverages.",
    tests: ["Complete Blood Count (CBC) with ESR (if fever persists >3 days)"],
  },
  {
    id: "bundle-hypertension",
    title: "Hypertension Stage 1 Bundle",
    category: "Cardiology / Internal Medicine",
    diagnosis: "Essential Hypertension (Stage 1)",
    medicines: [
      {
        name: "Camlosart",
        dosage: "5mg / 20mg",
        frequency: "1 tablet once daily",
        duration: "30 days",
        instruction: "Morning after breakfast regularly",
      },
      {
        name: "Cardibis",
        dosage: "2.5mg",
        frequency: "1 tablet once daily",
        duration: "30 days",
        instruction: "Morning after breakfast",
      },
    ],
    advice:
      "Strict low-salt diet (<5g per day). Avoid extra table salt. Daily 30-40 min aerobic walking. Record blood pressure twice weekly in BP diary.",
    tests: ["Serum Creatinine", "Serum Electrolytes", "Lipid Profile", "ECG"],
  },
  {
    id: "bundle-diabetes",
    title: "Type 2 Diabetes Mellitus Follow-up",
    category: "Endocrinology & Diabetology",
    diagnosis: "Type 2 Diabetes Mellitus with Mild Hyperglycemia",
    medicines: [
      {
        name: "Comet",
        dosage: "500mg",
        frequency: "1 tablet twice daily",
        duration: "30 days",
        instruction: "With or immediately after main meals",
      },
      {
        name: "Jardiance",
        dosage: "10mg",
        frequency: "1 tablet once daily",
        duration: "30 days",
        instruction: "Morning with water",
      },
    ],
    advice:
      "Strict low-glycemic dietary discipline. 30 minutes daily brisk walking. Regular self-monitoring of blood glucose (SMBG).",
    tests: ["Fasting Plasma Glucose (FPG)", "2-hour Postprandial Glucose (2h-PPG)", "HbA1c"],
  },
  {
    id: "bundle-gastritis",
    title: "Gastritis & Acid Peptic Bundle",
    category: "Gastroenterology",
    diagnosis: "Gastroesophageal Reflux Disease (GERD) & Dyspepsia",
    medicines: [
      {
        name: "Sergel",
        dosage: "20mg",
        frequency: "1 capsule twice daily",
        duration: "14 days",
        instruction: "30 minutes before meals",
      },
      {
        name: "Entacyd Plus",
        dosage: "2 teaspoons",
        frequency: "3 times daily",
        duration: "7 days",
        instruction: "1 hour after meals and at bedtime",
      },
    ],
    advice:
      "Avoid excess red meat, spicy, fried oily foods and citrus. Maintain 2 hours gap between dinner and sleeping.",
    tests: ["Ultrasonography of Whole Abdomen (if symptoms persist)"],
  },
  {
    id: "bundle-allergy",
    title: "Allergic Rhinitis & Dermatitis",
    category: "Dermatology / ENT",
    diagnosis: "Allergic Rhinitis and Urticaria",
    medicines: [
      {
        name: "Bilastin",
        dosage: "20mg",
        frequency: "1 tablet once daily",
        duration: "10 days",
        instruction: "1 hour before breakfast on empty stomach",
      },
      {
        name: "Flutivate Cream",
        dosage: "0.05%",
        frequency: "Apply twice daily",
        duration: "7 days",
        instruction: "Thin film applied to affected skin areas",
      },
    ],
    advice:
      "Avoid known allergens, dust, pollen, and synthetic wool clothing. Wash bedding weekly in hot water.",
    tests: ["Total IgE", "Absolute Eosinophil Count (AEC)"],
  },
];
