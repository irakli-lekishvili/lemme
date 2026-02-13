"use server";

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { revalidatePath } from "next/cache";

async function verifyAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) throw new Error("Forbidden");

  return user;
}

export async function deletePost(postId: string) {
  await verifyAdmin();

  const service = createServiceClient();

  const { error } = await service.from("posts").delete().eq("id", postId);

  if (error) throw new Error(error.message);

  revalidatePath("/admin/posts");
}
