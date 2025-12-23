"use client";

import { createClient } from "@/lib/supabase/client";
import { Check, GripVertical, ImagePlus, Loader2, Plus, Upload, X, Film } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

type Category = {
  id: string;
  name: string;
  slug: string;
  color: string | null;
};

type MediaFile = {
  id: string;
  file: File;
  preview: string;
  type: "image" | "video" | "gif";
};

const MAX_MEDIA = 10;
const VALID_IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];
const VALID_VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"];
const MAX_IMAGE_SIZE = 50 * 1024 * 1024; // 50MB
const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100MB
const ACCEPTED_TYPES = [...VALID_IMAGE_TYPES, ...VALID_VIDEO_TYPES].join(",");

export function UploadForm() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [media, setMedia] = useState<MediaFile[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.push("/login?redirect=/create");
      } else {
        setIsAuthenticated(true);
      }
    });

    // Fetch categories
    fetch("/api/categories")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setCategories(data);
        }
      })
      .catch(() => {});
  }, [router]);

  const toggleCategory = (categoryId: string) => {
    setSelectedCategories((prev) =>
      prev.includes(categoryId)
        ? prev.filter((id) => id !== categoryId)
        : prev.length < 3
          ? [...prev, categoryId]
          : prev
    );
  };

  const getMediaType = useCallback((mimeType: string): "image" | "video" | "gif" => {
    if (mimeType === "image/gif") return "gif";
    if (VALID_VIDEO_TYPES.includes(mimeType)) return "video";
    return "image";
  }, []);

  const validateFile = useCallback((file: File): string | null => {
    const isValidType = VALID_IMAGE_TYPES.includes(file.type) || VALID_VIDEO_TYPES.includes(file.type);
    if (!isValidType) {
      return "Invalid file type. Allowed: JPEG, PNG, GIF, WebP, MP4, WebM, MOV.";
    }

    const maxSize = VALID_VIDEO_TYPES.includes(file.type) ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE;
    if (file.size > maxSize) {
      const maxMB = Math.round(maxSize / (1024 * 1024));
      return `File too large. Maximum size is ${maxMB}MB.`;
    }

    return null;
  }, []);

  const handleFiles = useCallback((selectedFiles: FileList | File[]) => {
    const filesArray = Array.from(selectedFiles);
    const remainingSlots = MAX_MEDIA - media.length;

    if (filesArray.length > remainingSlots) {
      setError(`You can only add ${remainingSlots} more file${remainingSlots !== 1 ? 's' : ''}. Maximum is ${MAX_MEDIA}.`);
      return;
    }

    const newMedia: MediaFile[] = [];
    let hasError = false;

    for (const file of filesArray) {
      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        hasError = true;
        break;
      }

      const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const preview = URL.createObjectURL(file);
      const type = getMediaType(file.type);
      newMedia.push({ id, file, preview, type });
    }

    if (!hasError) {
      setError(null);
      setMedia((prev) => [...prev, ...newMedia]);
    }
  }, [media.length, validateFile, getMediaType]);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const droppedFiles = e.dataTransfer.files;
      if (droppedFiles.length > 0) {
        handleFiles(droppedFiles);
      }
    },
    [handleFiles]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const removeMedia = useCallback((id: string) => {
    setMedia((prev) => {
      const item = prev.find((m) => m.id === id);
      if (item) {
        URL.revokeObjectURL(item.preview);
      }
      return prev.filter((m) => m.id !== id);
    });
    setError(null);
  }, []);

  // Drag and drop reordering
  const handleMediaDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleMediaDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    setMedia((prev) => {
      const newMedia = [...prev];
      const draggedItem = newMedia[draggedIndex];
      newMedia.splice(draggedIndex, 1);
      newMedia.splice(index, 0, draggedItem);
      return newMedia;
    });
    setDraggedIndex(index);
  };

  const handleMediaDragEnd = () => {
    setDraggedIndex(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (media.length === 0) return;

    setIsUploading(true);
    setError(null);

    const formData = new FormData();
    media.forEach((item, index) => {
      formData.append(`file_${index}`, item.file);
    });
    formData.append("fileCount", media.length.toString());
    formData.append("title", title);
    formData.append("description", description);
    formData.append("categories", JSON.stringify(selectedCategories));

    try {
      const response = await fetch("/api/posts", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to upload");
      }

      // Clean up previews
      media.forEach((item) => {
        URL.revokeObjectURL(item.preview);
      });

      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsUploading(false);
    }
  };

  const clearAllMedia = () => {
    media.forEach((item) => {
      URL.revokeObjectURL(item.preview);
    });
    setMedia([]);
    setError(null);
  };

  if (isAuthenticated === null) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Upload Area */}
      {media.length === 0 ? (
        <div
          role="presentation"
          className={`relative border-2 border-dashed rounded-xl p-12 text-center transition-colors ${
            isDragging
              ? "border-primary-500 bg-primary-500/10"
              : "border-border-subtle hover:border-border-default"
          }`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <input
            type="file"
            accept={ACCEPTED_TYPES}
            multiple
            onChange={(e) => {
              const files = e.target.files;
              if (files && files.length > 0) handleFiles(files);
            }}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-bg-elevated flex items-center justify-center">
              <ImagePlus className="w-8 h-8 text-text-muted" />
            </div>
            <div>
              <p className="text-lg font-medium text-text-primary">
                Drop your files here
              </p>
              <p className="text-sm text-text-muted mt-1">
                or click to browse
              </p>
            </div>
            <p className="text-xs text-text-muted">
              Images up to 50MB · Videos up to 100MB · Max {MAX_MEDIA} files
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Media Preview Grid */}
          <ul className="grid grid-cols-2 sm:grid-cols-3 gap-3 list-none p-0 m-0">
            {media.map((item, index) => (
              <li
                key={item.id}
                draggable
                onDragStart={() => handleMediaDragStart(index)}
                onDragOver={(e) => handleMediaDragOver(e, index)}
                onDragEnd={handleMediaDragEnd}
                className={`relative group rounded-lg overflow-hidden bg-bg-elevated aspect-square ${
                  draggedIndex === index ? "opacity-50" : ""
                }`}
              >
                {item.type === "video" ? (
                  <video
                    src={item.preview}
                    className="w-full h-full object-cover"
                    muted
                    playsInline
                  />
                ) : (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={item.preview}
                    alt={`Preview ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                )}

                {/* Video indicator */}
                {item.type === "video" && (
                  <div className="absolute bottom-2 right-2 p-1.5 bg-black/70 rounded-lg">
                    <Film className="w-4 h-4 text-white" />
                  </div>
                )}

                {/* Position badge */}
                <div className="absolute top-2 left-2 w-6 h-6 rounded-full bg-black/70 text-white text-xs font-medium flex items-center justify-center">
                  {index + 1}
                </div>

                {/* Drag handle */}
                <div className="absolute top-2 right-10 p-1.5 bg-bg-base/80 backdrop-blur-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity cursor-grab">
                  <GripVertical className="w-4 h-4 text-text-primary" />
                </div>

                {/* Remove button */}
                <button
                  type="button"
                  onClick={() => removeMedia(item.id)}
                  className="absolute top-2 right-2 p-1.5 bg-bg-base/80 backdrop-blur-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-bg-hover"
                >
                  <X className="w-4 h-4 text-text-primary" />
                </button>

                {/* First item indicator */}
                {index === 0 && (
                  <div className="absolute bottom-2 left-2 px-2 py-1 bg-primary-500/90 backdrop-blur-sm rounded text-[10px] font-medium text-white">
                    Cover
                  </div>
                )}
              </li>
            ))}

            {/* Add more button */}
            {media.length < MAX_MEDIA && (
              <li className="list-none">
                <label
                  className={`relative aspect-square rounded-lg border-2 border-dashed transition-colors cursor-pointer flex flex-col items-center justify-center gap-2 ${
                    isDragging
                      ? "border-primary-500 bg-primary-500/10"
                      : "border-border-subtle hover:border-border-default hover:bg-bg-elevated"
                  }`}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                >
                  <input
                    type="file"
                    accept={ACCEPTED_TYPES}
                    multiple
                    onChange={(e) => {
                      const files = e.target.files;
                      if (files && files.length > 0) handleFiles(files);
                    }}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <Plus className="w-6 h-6 text-text-muted" />
                  <span className="text-xs text-text-muted">Add more</span>
                </label>
              </li>
            )}
          </ul>

          {/* Clear all button */}
          <div className="flex justify-end">
            <button
              type="button"
              onClick={clearAllMedia}
              className="text-sm text-text-muted hover:text-text-primary transition-colors"
            >
              Clear all
            </button>
          </div>

          {/* Reorder hint */}
          <p className="text-xs text-text-muted text-center">
            Drag to reorder · First item is the cover
          </p>
        </div>
      )}

      {/* Title */}
      <div>
        <label
          htmlFor="title"
          className="block text-sm font-medium text-text-secondary mb-2"
        >
          Title (optional)
        </label>
        <input
          type="text"
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Give your creation a title"
          className="w-full px-4 py-3 bg-bg-elevated border border-border-subtle rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        />
      </div>

      {/* Description */}
      <div>
        <label
          htmlFor="description"
          className="block text-sm font-medium text-text-secondary mb-2"
        >
          Description (optional)
        </label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe your artwork..."
          rows={3}
          className="w-full px-4 py-3 bg-bg-elevated border border-border-subtle rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
        />
      </div>

      {/* Categories */}
      {categories.length > 0 && (
        <fieldset className="border-0 p-0 m-0">
          <legend className="block text-sm font-medium text-text-secondary mb-2">
            Category <span className="text-primary-500">*</span>
            <span className="text-text-muted font-normal ml-1">(select 1-3)</span>
          </legend>
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => {
              const isSelected = selectedCategories.includes(category.id);
              return (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => toggleCategory(category.id)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${
                    isSelected
                      ? "bg-primary-500 text-white"
                      : "bg-bg-elevated text-text-secondary hover:bg-bg-hover hover:text-text-primary"
                  }`}
                  style={
                    isSelected && category.color
                      ? { backgroundColor: category.color }
                      : undefined
                  }
                >
                  {isSelected && <Check className="w-3.5 h-3.5" />}
                  {category.name}
                </button>
              );
            })}
          </div>
          {selectedCategories.length === 3 && (
            <p className="text-xs text-text-muted mt-2">
              Maximum 3 categories selected
            </p>
          )}
        </fieldset>
      )}

      {/* Error */}
      {error && (
        <div className="p-4 bg-error-500/10 border border-error-500/20 rounded-lg">
          <p className="text-sm text-error-400">{error}</p>
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={media.length === 0 || selectedCategories.length === 0 || isUploading}
        className="w-full btn btn-primary py-3 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed mt-4"
      >
        {isUploading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Uploading...
          </>
        ) : (
          <>
            <Upload className="w-5 h-5" />
            Publish {media.length > 1 ? `(${media.length} files)` : ""}
          </>
        )}
      </button>
    </form>
  );
}
