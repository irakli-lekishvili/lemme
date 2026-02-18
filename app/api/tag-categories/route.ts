import { createServiceClient } from "@/lib/supabase/service";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * GET /api/tag-categories
 *
 * Returns all AI tag categories with their distinct values and counts.
 * Useful for building filter/facet UI.
 *
 * Response:
 *   {
 *     categories: [
 *       {
 *         name: "hair",
 *         values: [{ value: "blonde", count: 45 }, ...]
 *       },
 *       ...
 *     ]
 *   }
 */
export async function GET() {
  const supabase = createServiceClient();

  const { data, error } = await supabase.rpc("get_tag_counts");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Group flat rows into { name, values[] } objects
  const categoryMap = new Map<string, { value: string; count: number }[]>();

  for (const row of data as { tag_category: string; tag_value: string; count: number }[]) {
    if (!categoryMap.has(row.tag_category)) {
      categoryMap.set(row.tag_category, []);
    }
    categoryMap.get(row.tag_category)!.push({
      value: row.tag_value,
      count: Number(row.count),
    });
  }

  const categories = Array.from(categoryMap.entries()).map(([name, values]) => ({
    name,
    values,
  }));

  return NextResponse.json({ categories });
}
