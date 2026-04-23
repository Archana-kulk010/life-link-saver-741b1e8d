export const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "Bombay"] as const;
export type BloodType = (typeof BLOOD_TYPES)[number];

export const URGENCY_LEVELS = ["critical", "urgent", "normal"] as const;
export type Urgency = (typeof URGENCY_LEVELS)[number];

// Universal donor/recipient compatibility (simplified)
const COMPATIBILITY: Record<string, string[]> = {
  "O-": ["O-"],
  "O+": ["O-", "O+"],
  "A-": ["O-", "A-"],
  "A+": ["O-", "O+", "A-", "A+"],
  "B-": ["O-", "B-"],
  "B+": ["O-", "O+", "B-", "B+"],
  "AB-": ["O-", "A-", "B-", "AB-"],
  "AB+": ["O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"],
  Bombay: ["Bombay"],
};

export function compatibleDonorTypes(recipient: BloodType): BloodType[] {
  return (COMPATIBILITY[recipient] ?? [recipient]) as BloodType[];
}

export function isRare(bt: BloodType) {
  return bt === "Bombay" || bt === "AB-" || bt === "B-" || bt === "O-";
}

// Haversine distance in km
export function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(a));
}

// Eligibility: must wait 90 days between donations
export function daysUntilEligible(lastDonationDate: string | null): number {
  if (!lastDonationDate) return 0;
  const last = new Date(lastDonationDate).getTime();
  const eligibleAt = last + 90 * 24 * 60 * 60 * 1000;
  const remaining = Math.ceil((eligibleAt - Date.now()) / (24 * 60 * 60 * 1000));
  return Math.max(0, remaining);
}

export function isEligible(lastDonationDate: string | null) {
  return daysUntilEligible(lastDonationDate) === 0;
}

export const URGENCY_STYLES: Record<Urgency, { label: string; cls: string }> = {
  critical: { label: "Critical", cls: "bg-critical text-white" },
  urgent: { label: "Urgent", cls: "bg-urgent text-white" },
  normal: { label: "Normal", cls: "bg-normal text-white" },
};
