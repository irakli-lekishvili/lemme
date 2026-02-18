"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import type { CollectionItem } from "@/app/admin/collections/[slug]/page";
import {
  addItemsToCollection,
  removeItemFromCollection,
  searchMedia,
  type SearchMediaResult,
} from "@/app/admin/collections/actions";
import { Loader2, Plus, Search, Trash2, X } from "lucide-react";

// ---------------------------------------------------------------------------
// Add items panel — search media and add to collection
// ---------------------------------------------------------------------------

function AddItemsPanel({
  collectionId,
  onAdded,
}: {
  collectionId: string;
  onAdded: () => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchMediaResult[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isSearching, setIsSearching] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdding, startAdding] = useTransition();
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);
  const hasMounted = useRef(false);

  // Debounced search — immediate on first mount, debounced after
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const delay = hasMounted.current ? 300 : 0;
    hasMounted.current = true;

    debounceRef.current = setTimeout(async () => {
      setIsSearching(true);
      setError(null);
      try {
        const res = await searchMedia(query, collectionId);
        setResults(res);
      } catch (e) {
        setResults([]);
        setError(e instanceof Error ? e.message : "Failed to search media");
      } finally {
        setIsSearching(false);
      }
    }, delay);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, collectionId]);

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleAdd() {
    if (selected.size === 0) return;
    startAdding(async () => {
      await addItemsToCollection(collectionId, [...selected]);
      setSelected(new Set());
      setQuery("");
      onAdded();
    });
  }

  return (
    <div className="bg-bg-card border border-border-subtle rounded-xl p-4 space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search media by title or ID..."
            className="input w-full !pl-10"
          />
        </div>
        {selected.size > 0 && (
          <button
            type="button"
            onClick={handleAdd}
            disabled={isAdding}
            className="btn btn-primary py-2 px-4 flex items-center gap-2 whitespace-nowrap"
          >
            {isAdding ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
            Add {selected.size} {selected.size === 1 ? "item" : "items"}
          </button>
        )}
      </div>

      {isSearching && (
        <div className="flex justify-center py-4">
          <Loader2 className="w-5 h-5 text-text-muted animate-spin" />
        </div>
      )}

      {!isSearching && results.length > 0 && (
        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2 max-h-80 overflow-y-auto">
          {results.map((item) => {
            const isSelected = selected.has(item.id);
            const src = item.thumbnail_url || item.media_url;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => toggleSelect(item.id)}
                className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-colors ${
                  isSelected
                    ? "border-primary-500"
                    : "border-transparent hover:border-border-strong"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={src}
                  alt={item.title || item.id}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
                {isSelected && (
                  <div className="absolute inset-0 bg-primary-500/30 flex items-center justify-center">
                    <div className="w-6 h-6 rounded-full bg-primary-500 flex items-center justify-center">
                      <Plus className="w-4 h-4 text-white" />
                    </div>
                  </div>
                )}
                {item.media_type === "video" && (
                  <div className="absolute top-1 right-1 text-[10px] bg-black/60 text-white px-1 rounded">
                    VID
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}

      {!isSearching && error && (
        <p className="text-sm text-red-400 text-center py-4">{error}</p>
      )}

      {!isSearching && !error && results.length === 0 && (
        <p className="text-sm text-text-muted text-center py-4">
          {query ? "No media found." : "No media available. Import media first via the API."}
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Collection items manager
// ---------------------------------------------------------------------------

export function CollectionItemsManager({
  collectionId,
  collectionSlug,
  items: initialItems,
}: {
  collectionId: string;
  collectionSlug: string;
  items: CollectionItem[];
}) {
  const [showAdd, setShowAdd] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleRemove(mediaId: string) {
    setRemovingId(mediaId);
    startTransition(async () => {
      await removeItemFromCollection(collectionId, mediaId);
      setRemovingId(null);
    });
  }

  return (
    <div className="space-y-6">
      {/* Toggle add panel */}
      {showAdd ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-text-secondary">Add Media</h3>
            <button
              type="button"
              onClick={() => setShowAdd(false)}
              className="p-1 text-text-muted hover:text-text-primary"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <AddItemsPanel
            collectionId={collectionId}
            onAdded={() => setShowAdd(false)}
          />
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowAdd(true)}
          className="btn btn-primary py-2.5 px-4 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Items
        </button>
      )}

      {/* Current items grid */}
      {initialItems.length === 0 ? (
        <p className="text-sm text-text-muted py-8 text-center">
          No items in this collection yet. Use the button above to add media.
        </p>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
          {initialItems.map((item) => {
            const src = item.thumbnail_url || item.media_url;
            const isRemoving = removingId === item.media_id;
            return (
              <div key={item.media_id} className="group relative">
                <div className="aspect-square rounded-lg overflow-hidden bg-bg-elevated">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={src}
                    alt={item.title || item.media_id}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>
                {/* Remove button on hover */}
                <button
                  type="button"
                  onClick={() => handleRemove(item.media_id)}
                  disabled={isPending}
                  className="absolute top-1 right-1 p-1 rounded-md bg-black/70 text-white/70 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Remove from collection"
                >
                  {isRemoving ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="w-3.5 h-3.5" />
                  )}
                </button>
                {item.media_type === "video" && (
                  <div className="absolute bottom-1 left-1 text-[10px] bg-black/60 text-white px-1 rounded">
                    VID
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
