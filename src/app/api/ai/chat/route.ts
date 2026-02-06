import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json(
    {
      ok: false,
      message:
        "Not implemented. This endpoint will accept a chat request and return assistant_message + operations[].",
    },
    { status: 501 },
  );
}
