import { Navbar } from "@/components/layout/navbar";
import { PostDetail } from "@/components/gallery/post-detail";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";

type PostData = {
  id: string;
  image_url: string;
  likes_count: number;
  title: string | null;
  description: string | null;
  user_id: string | null;
  created_at: string;
  short_id: string | null;
};

async function getPost(id: string): Promise<PostData | null> {
  try {
    const supabase = await createClient();

    // Try to find by slug first, then by id
    let post = null;

    // Check if it looks like a UUID
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        id
      );

    if (isUuid) {
      const { data } = await supabase
        .from("posts")
        .select("id, image_url, likes_count, title, description, user_id, created_at, short_id")
        .eq("id", id)
        .single();
      post = data;
    } else {
      // Try finding by short_id
      const { data } = await supabase
        .from("posts")
        .select("id, image_url, likes_count, title, description, user_id, created_at, short_id")
        .eq("short_id", id)
        .single();
      post = data;
    }

    return post;
  } catch {
    return null;
  }
}

type Params = Promise<{ id: string }>;

export default async function PostPage({ params }: { params: Params }) {
  const { id } = await params;
  const post = await getPost(id);

  if (!post) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-bg-base">
      <Navbar />

      <main className="pt-24 pb-12">
        <div className="max-w-[935px] mx-auto px-4">
          <PostDetail post={post} />
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border-subtle py-8">
        <div className="max-w-[935px] mx-auto px-4">
          <div className="flex flex-col items-center gap-4 text-center">
            <p className="text-sm text-text-muted">
              © {new Date().getFullYear()} Lemme.Love. All rights reserved.
            </p>
            <div className="flex items-center gap-6">
              <Link
                href="/terms"
                className="text-sm text-text-muted hover:text-text-primary transition-colors"
              >
                Terms
              </Link>
              <Link
                href="/privacy"
                className="text-sm text-text-muted hover:text-text-primary transition-colors"
              >
                Privacy
              </Link>
              <Link
                href="/support"
                className="text-sm text-text-muted hover:text-text-primary transition-colors"
              >
                Support
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
