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

  const { error } = await service
    .from("posts")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", postId);

  if (error) throw new Error(error.message);

  revalidatePath("/admin/posts");
}

export async function deletePosts(postIds: string[]) {
  await verifyAdmin();

  if (postIds.length === 0) return;

  const service = createServiceClient();

  const { error } = await service
    .from("posts")
    .update({ deleted_at: new Date().toISOString() })
    .in("id", postIds);

  if (error) throw new Error(error.message);

  revalidatePath("/admin/posts");
}
