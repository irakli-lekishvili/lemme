import { NextResponse } from "next/server";

const API_SECRET_KEY = process.env.API_SECRET_KEY;

export type AuthResult =
  | { success: true }
  | { success: false; response: NextResponse };

export function validateBearerToken(request: Request): AuthResult {
  if (!API_SECRET_KEY) {
    console.error("API_SECRET_KEY is not configured");
    return {
      success: false,
      response: NextResponse.json(
        { error: "API not configured" },
        { status: 500 }
      ),
    };
  }

  const authHeader = request.headers.get("Authorization");

  if (!authHeader) {
    return {
      success: false,
      response: NextResponse.json(
        { error: "Missing Authorization header" },
        { status: 401 }
      ),
    };
  }

  if (!authHeader.startsWith("Bearer ")) {
    return {
      success: false,
      response: NextResponse.json(
        { error: "Invalid Authorization header format. Expected: Bearer <token>" },
        { status: 401 }
      ),
    };
  }

  const token = authHeader.slice(7);

  if (token !== API_SECRET_KEY) {
    return {
      success: false,
      response: NextResponse.json({ error: "Invalid token" }, { status: 401 }),
    };
  }

  return { success: true };
}
