import { DeliverySlotConfig, ServiceableZone } from "./types";

export const DEFAULT_DELIVERY_SLOTS: DeliverySlotConfig[] = [
  {
    id: "slot-morning",
    label: "Morning: 07:00 AM – 09:00 AM",
    capacity: 25,
    bookedCount: 4,
    active: true,
  },
  {
    id: "slot-1",
    label: "Slot 1: 10:00 AM – 12:00 PM",
    capacity: 30,
    bookedCount: 8,
    active: true,
  },
  {
    id: "slot-2",
    label: "Slot 2: 12:00 PM – 02:00 PM",
    capacity: 30,
    bookedCount: 5,
    active: true,
  },
  {
    id: "slot-evening",
    label: "Evening: 04:00 PM – 06:00 PM",
    capacity: 35,
    bookedCount: 11,
    active: true,
  },
  {
    id: "slot-night",
    label: "Night: 07:00 PM – 09:00 PM",
    capacity: 25,
    bookedCount: 6,
    active: true,
  },
];

export const DEFAULT_SERVICEABLE_ZONES: ServiceableZone[] = [
  { pincode: "400001", city: "Mumbai", state: "Maharashtra", areaName: "Fort & Colaba Hub", estimatedWindow: "2–3 hours", serviceable: true },
  { pincode: "400050", city: "Mumbai", state: "Maharashtra", areaName: "Bandra West Organic Hub", estimatedWindow: "90 mins", serviceable: true },
  { pincode: "560001", city: "Bengaluru", state: "Karnataka", areaName: "MG Road & Central Hub", estimatedWindow: "90 mins", serviceable: true },
  { pincode: "560034", city: "Bengaluru", state: "Karnataka", areaName: "Koramangala Fresh Hub", estimatedWindow: "60 mins", serviceable: true },
  { pincode: "110001", city: "New Delhi", state: "Delhi", areaName: "Connaught Place Hub", estimatedWindow: "2 hours", serviceable: true },
];

export function checkPincodeServiceability(pincode: string): {
  serviceable: boolean;
  zone?: ServiceableZone;
  message: string;
} {
  const cleanPin = (pincode || "").trim();
  if (!/^[1-9][0-9]{5}$/.test(cleanPin)) {
    return {
      serviceable: false,
      message: "Enter a valid 6-digit Indian PIN code.",
    };
  }

  const exactMatch = DEFAULT_SERVICEABLE_ZONES.find((z) => z.pincode === cleanPin && z.serviceable);
  if (exactMatch) {
    return {
      serviceable: true,
      zone: exactMatch,
      message: `Delivering from ${exactMatch.areaName}, ${exactMatch.city} (Est. ${exactMatch.estimatedWindow}).`,
    };
  }

  const metroPrefixes: Record<string, { city: string; state: string; hub: string }> = {
    "400": { city: "Mumbai", state: "Maharashtra", hub: "Mumbai Central Hub" },
    "560": { city: "Bengaluru", state: "Karnataka", hub: "Bengaluru South Hub" },
    "110": { city: "New Delhi", state: "Delhi", hub: "Delhi NCR Hub" },
    "600": { city: "Chennai", state: "Tamil Nadu", hub: "Chennai Hub" },
    "500": { city: "Hyderabad", state: "Telangana", hub: "Hyderabad Hub" },
    "700": { city: "Kolkata", state: "West Bengal", hub: "Kolkata Hub" },
    "411": { city: "Pune", state: "Maharashtra", hub: "Pune Express Hub" },
  };

  const prefix = cleanPin.slice(0, 3);
  const metro = metroPrefixes[prefix];
  if (metro) {
    return {
      serviceable: true,
      zone: {
        pincode: cleanPin,
        city: metro.city,
        state: metro.state,
        areaName: metro.hub,
        estimatedWindow: "Same-Day Delivery",
        serviceable: true,
      },
      message: `Delivering to ${metro.city} from ${metro.hub} (Same-Day Delivery).`,
    };
  }

  return {
    serviceable: false,
    message: `PIN code ${cleanPin} is outside our current express grocery delivery perimeter. We are expanding rapidly!`,
  };
}
