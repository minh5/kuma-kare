const CARE_GUIDE = `
Kuma Kare Pet Care Guide

Feeding:
- Feed the pet at regular times each day, typically morning and evening.
- Provide fresh water at all times.
- Follow the specific dietary requirements provided by the owner.

Exercise:
- Walk dogs at least twice a day.
- Provide playtime and enrichment activities for cats and other pets.
- Monitor the pet for signs of fatigue or distress during exercise.

Medication:
- Administer medications exactly as prescribed by the veterinarian.
- Keep a written schedule of medication times.
- Never give human medications without veterinary approval.

Safety:
- Keep doors and gates closed to prevent escapes.
- Remove hazardous items from the pet's reach.
- Supervise interactions with unfamiliar animals or people.

General Wellbeing:
- Observe the pet's behavior and note any changes.
- Maintain a calm and comforting environment.
- Follow the owner's instructions for routines and preferences.
`;

const EMERGENCY_CONTACTS = `
Emergency Contacts for Pet Care

Primary Veterinarian:
- Contact the owner's designated veterinary clinic for non-life-threatening issues.
- Have the clinic name and address ready before contacting.

Emergency Veterinary Hospital:
- For after-hours emergencies, locate the nearest 24-hour emergency animal hospital.
- Call ahead to let them know you are coming.

Owner Contact:
- Reach out to the pet owner immediately for any concerns or emergencies.
- Keep the owner's preferred contact method on hand.

Poison Control:
- For suspected poisoning, contact a pet poison helpline for guidance.
- Have information about the substance and amount ingested ready.
`;

export function getCareGuide(): string {
  return CARE_GUIDE.trim();
}

export function getEmergencyContacts(): string {
  return EMERGENCY_CONTACTS.trim();
}
