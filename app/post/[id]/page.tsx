import { Navbar } from "@/components/layout/navbar";
import { PostDetail } from "@/components/gallery/post-detail";
import { RelatedPosts } from "@/components/gallery/related-posts";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";

type PostData = {
  id: string;
  image_url: string;
  likes_count: number;
  title: string | null;
  description: string | null;
  user_id: string | null;
  created_at: string;
  short_id: string | null;
  media_type: "image" | "video" | "gif" | null;
  thumbnail_url: string | null;
};

type RelatedPost = {
  id: string;
  image_url: string;
  short_id: string | null;
  title: string | null;
  media_type: "image" | "video" | "gif" | null;
  thumbnail_url: string | null;
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
        .select("id, image_url, likes_count, title, description, user_id, created_at, short_id, media_type, thumbnail_url")
        .eq("id", id)
        .single();
      post = data;
    } else {
      // Try finding by short_id
      const { data } = await supabase
        .from("posts")
        .select("id, image_url, likes_count, title, description, user_id, created_at, short_id, media_type, thumbnail_url")
        .eq("short_id", id)
        .single();
      post = data;
    }

    return post;
  } catch {
    return null;
  }
}

async function getRelatedPosts(postId: string): Promise<RelatedPost[]> {
  try {
    const supabase = await createClient();

    // Get categories for this post
    const { data: postCategories } = await supabase
      .from("post_categories")
      .select("category_id")
      .eq("post_id", postId);

    if (!postCategories || postCategories.length === 0) {
      return [];
    }

    const categoryIds = postCategories.map((pc) => pc.category_id);

    // Get other posts in the same categories
    const { data: relatedPostCategories } = await supabase
      .from("post_categories")
      .select("post_id")
      .in("category_id", categoryIds)
      .neq("post_id", postId);

    if (!relatedPostCategories || relatedPostCategories.length === 0) {
      return [];
    }

    // Get unique post IDs
    const relatedPostIds = [...new Set(relatedPostCategories.map((pc) => pc.post_id))];

    // Fetch the related posts
    const { data: posts } = await supabase
      .from("posts")
      .select("id, image_url, short_id, title, media_type, thumbnail_url")
      .in("id", relatedPostIds)
      .limit(8);

    return posts || [];
  } catch {
    return [];
  }
}

type Params = Promise<{ id: string }>;

export default async function PostPage({ params }: { params: Params }) {
  const { id } = await params;
  const post = await getPost(id);

  if (!post) {
    notFound();
  }

  const relatedPosts = await getRelatedPosts(post.id);

  return (
    <div className="min-h-screen bg-bg-base">
      <Navbar />

      <main className="pt-24 pb-12">
        <div className="max-w-[935px] mx-auto px-4">
          <PostDetail post={post} />
        </div>

        {/* Related Posts */}
        {relatedPosts.length > 0 && (
          <div className="max-w-[1200px] mx-auto px-4 mt-12">
            <h2 className="text-lg font-semibold text-text-primary mb-4">
              More like this
            </h2>
            <RelatedPosts posts={relatedPosts} />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border-subtle py-8">
        <div className="max-w-[935px] mx-auto px-4">
          <p className="text-sm text-text-muted text-center">
            © {new Date().getFullYear()} Lemme.Love. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
