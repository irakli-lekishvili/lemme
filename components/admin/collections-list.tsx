"use client";

import { useState, useTransition } from "react";
import type { AdminCollection } from "@/app/admin/collections/page";
import { createCollection, deleteCollection } from "@/app/admin/collections/actions";
import { Calendar, ExternalLink, Images, Pencil, Plus, Trash2 } from "lucide-react";
import Link from "next/link";

// ---------------------------------------------------------------------------
// Create collection form
// ---------------------------------------------------------------------------

function CreateCollectionForm() {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      try {
        await createCollection(formData);
        setIsOpen(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to create collection");
      }
    });
  }

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="btn btn-primary py-2.5 px-4 flex items-center gap-2"
      >
        <Plus className="w-4 h-4" />
        New Collection
      </button>
    );
  }

  return (
    <form
      action={handleSubmit}
      className="bg-bg-card border border-border-subtle rounded-xl p-6 space-y-4"
    >
      <h3 className="text-lg font-semibold text-text-primary">New Collection</h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-text-secondary mb-1">
            Name
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            placeholder="My Collection"
            className="input w-full"
          />
        </div>
        <div>
          <label htmlFor="slug" className="block text-sm font-medium text-text-secondary mb-1">
            Slug
          </label>
          <input
            id="slug"
            name="slug"
            type="text"
            required
            placeholder="my-collection"
            pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
            title="Lowercase letters, numbers, and hyphens only"
            className="input w-full"
          />
        </div>
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium text-text-secondary mb-1">
          Description
        </label>
        <textarea
          id="description"
          name="description"
          rows={2}
          placeholder="Optional description..."
          className="input w-full resize-none"
        />
      </div>

      <div>
        <label htmlFor="cover_image_url" className="block text-sm font-medium text-text-secondary mb-1">
          Cover Image URL
        </label>
        <input
          id="cover_image_url"
          name="cover_image_url"
          type="url"
          placeholder="https://..."
          className="input w-full"
        />
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <div className="flex items-center gap-3">
        <button type="submit" disabled={isPending} className="btn btn-primary py-2 px-4">
          {isPending ? "Creating..." : "Create"}
        </button>
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          className="btn btn-secondary py-2 px-4"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Collection row
// ---------------------------------------------------------------------------

function CollectionRow({ collection }: { collection: AdminCollection }) {
  const [isPending, startTransition] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);

  function handleDelete() {
    startTransition(async () => {
      await deleteCollection(collection.id);
    });
  }

  return (
    <div className="bg-bg-card border border-border-subtle rounded-xl p-4 flex items-center gap-4">
      {/* Thumbnail */}
      <div className="w-16 h-16 rounded-lg bg-bg-elevated overflow-hidden flex-shrink-0">
        {collection.cover_image_url ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={collection.cover_image_url}
            alt={collection.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Images className="w-6 h-6 text-text-muted" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-semibold text-text-primary truncate">{collection.name}</h3>
        <p className="text-xs text-text-muted mt-0.5">
          /{collection.slug} &middot; {collection.item_count} {collection.item_count === 1 ? "item" : "items"}
        </p>
        {collection.description && (
          <p className="text-xs text-text-secondary mt-1 truncate">{collection.description}</p>
        )}
      </div>

      {/* Meta */}
      <div className="hidden sm:flex items-center gap-1 text-xs text-text-muted flex-shrink-0">
        <Calendar className="w-3.5 h-3.5" />
        {new Date(collection.created_at).toLocaleDateString()}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <Link
          href={`/admin/collections/${collection.slug}`}
          className="p-2 rounded-lg hover:bg-bg-hover transition-colors text-text-secondary hover:text-text-primary"
          title="Manage items"
        >
          <Pencil className="w-4 h-4" />
        </Link>
        <Link
          href={`/c/${collection.slug}`}
          className="p-2 rounded-lg hover:bg-bg-hover transition-colors text-text-secondary hover:text-text-primary"
          title="View collection"
        >
          <ExternalLink className="w-4 h-4" />
        </Link>

        {confirmDelete ? (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleDelete}
              disabled={isPending}
              className="text-xs text-red-400 hover:text-red-300 px-2 py-1 rounded bg-red-500/10"
            >
              {isPending ? "..." : "Confirm"}
            </button>
            <button
              type="button"
              onClick={() => setConfirmDelete(false)}
              className="text-xs text-text-muted hover:text-text-primary px-2 py-1"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            className="p-2 rounded-lg hover:bg-red-500/10 transition-colors text-text-secondary hover:text-red-400"
            title="Delete collection"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Collections list
// ---------------------------------------------------------------------------

export function CollectionsList({ collections }: { collections: AdminCollection[] }) {
  return (
    <div className="space-y-4">
      <CreateCollectionForm />

      {collections.length > 0 && (
        <div className="space-y-3">
          {collections.map((c) => (
            <CollectionRow key={c.id} collection={c} />
          ))}
        </div>
      )}
    </div>
  );
}
