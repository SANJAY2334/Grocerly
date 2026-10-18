import { NextResponse } from "next/server";
import { checkPincodeServiceability, DEFAULT_DELIVERY_SLOTS, DEFAULT_SERVICEABLE_ZONES } from "@/lib/delivery";
import { sanitizeString } from "@/lib/validation";
import { createErrorResponse } from "@/lib/errors";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const pincode = sanitizeString(url.searchParams.get("pincode") || "", 10);

    const slots = DEFAULT_DELIVERY_SLOTS.map((slot) => ({
      ...slot,
      availableCapacity: Math.max(0, slot.capacity - slot.bookedCount),
      isAvailable: slot.active && slot.bookedCount < slot.capacity,
    }));

    if (!pincode) {
      return NextResponse.json(
        {
          slots,
          serviceableZones: DEFAULT_SERVICEABLE_ZONES.filter((z) => z.serviceable),
        },
        { status: 200 }
      );
    }

    const pinResult = checkPincodeServiceability(pincode);

    return NextResponse.json(
      {
        pincode,
        serviceable: pinResult.serviceable,
        zone: pinResult.zone || null,
        message: pinResult.message,
        slots,
      },
      { status: 200 }
    );
  } catch (err) {
    return createErrorResponse(err);
  }
}
