import { NextResponse } from "next/server";
import { ProductModel } from "@/lib/models/Product";
import { connectToDatabase } from "@/lib/db/connection";
import { sanitizeString } from "@/lib/validation";
import { createErrorResponse } from "@/lib/errors";

export async function GET(
  _req: Request,
  context: { params: { id: string } }
) {
  try {
    await connectToDatabase();
    const productId = sanitizeString(context.params.id, 80);

    const product = await ProductModel.findOne({
      $or: [{ id: productId }, { slug: productId }],
    }).lean();

    if (!product) {
      return NextResponse.json(
        { error: `Product "${productId}" not found.` },
        { status: 404 }
      );
    }

    return NextResponse.json({ product }, { status: 200 });
  } catch (err) {
    return createErrorResponse(err);
  }
}
