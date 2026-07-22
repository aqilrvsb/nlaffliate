"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";
import PostGrid, { PostItem } from "@/app/affiliate/PostGrid";

/**
 * One affiliate's posts, in the same grid the affiliate sees.
 *
 * Read-only: posting is the affiliate's job, and the TikTok link is what
 * moves a post to Done — the marketer is here to watch what was handed over,
 * not to close it out on their behalf.
 */
export default function AffiliatePosts({
  affiliateId, affiliateName, status, onBack,
}: {
  affiliateId: number;
  affiliateName: string;
  status: "pending" | "done";
  onBack: () => void;
}) {
  const [posts, setPosts] = useState<PostItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const d = await fetch(`/api/posts?user_id=${affiliateId}`).then((r) => r.json());
    setPosts(d.posts || []);
    setLoading(false);
  }, [affiliateId]);
  useEffect(() => { load(); }, [load]);

  const items = posts.filter((p) => p.status === status);
  const heading = status === "pending" ? "Pending Post" : "Done Post";

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="section-title">{heading}</h2>
          <p className="text-sm text-muted-fg">{affiliateName}</p>
        </div>
        <button className="btn-ghost !py-2" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Posting Affiliate
        </button>
      </div>

      {loading ? (
        <p className="flex items-center gap-2 text-sm text-muted-fg">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />Loading…
        </p>
      ) : (
        <PostGrid items={items} reload={load} readOnly
          emptyText={
            status === "pending"
              ? `${affiliateName} tiada pending post.`
              : `${affiliateName} belum ada done post.`
          } />
      )}
    </>
  );
}
