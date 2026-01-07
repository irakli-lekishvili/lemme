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

type UploadStatus = "pending" | "uploading" | "complete" | "error";

type MediaFile = {
  id: string;
  file: File;
  preview: string;
  type: "image" | "video" | "gif";
  uploadStatus: UploadStatus;
  uploadProgress: number;
  cloudflareId?: string;
  error?: string;
};

const MAX_MEDIA = 10;
const VALID_IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];
const VALID_VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"];
const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100MB
const ACCEPTED_TYPES = [...VALID_IMAGE_TYPES, ...VALID_VIDEO_TYPES].join(",");

async function uploadImageToCloudflare(
  file: File,
  onProgress: (progress: number) => void
): Promise<string> {
  // Get direct upload URL from our API
  const urlResponse = await fetch("/api/upload/image", { method: "POST" });
  if (!urlResponse.ok) {
    const error = await urlResponse.json();
    throw new Error(error.error || "Failed to get upload URL");
  }
  const { id, uploadURL } = await urlResponse.json();

  // Upload directly to Cloudflare
  const formData = new FormData();
  formData.append("file", file);

  const xhr = new XMLHttpRequest();

  return new Promise((resolve, reject) => {
    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    });

    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(id);
      } else {
        reject(new Error("Upload failed"));
      }
    });

    xhr.addEventListener("error", () => reject(new Error("Upload failed")));
    xhr.open("POST", uploadURL);
    xhr.send(formData);
  });
}

async function uploadVideoToCloudflare(
  file: File,
  onProgress: (progress: number) => void
): Promise<string> {
  // Get direct upload URL from our API (must include file size for TUS protocol)
  const urlResponse = await fetch("/api/upload/video", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ maxDurationSeconds: 1800, fileSize: file.size }),
  });
  if (!urlResponse.ok) {
    const error = await urlResponse.json();
    throw new Error(error.error || "Failed to get upload URL");
  }
  const { uid, uploadURL } = await urlResponse.json();

  // Upload directly to Cloudflare using TUS protocol
  const xhr = new XMLHttpRequest();

  return new Promise((resolve, reject) => {
    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    });

    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(uid);
      } else {
        reject(new Error("Video upload failed"));
      }
    });

    xhr.addEventListener("error", () => reject(new Error("Video upload failed")));
    xhr.open("PATCH", uploadURL);
    xhr.setRequestHeader("Content-Type", "application/offset+octet-stream");
    xhr.setRequestHeader("Upload-Offset", "0");
    xhr.setRequestHeader("Tus-Resumable", "1.0.0");
    xhr.send(file);
  });
}

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

  const uploadFileToCloudflare = useCallback(async (mediaItem: MediaFile) => {
    const updateProgress = (progress: number) => {
      setMedia((prev) =>
        prev.map((m) =>
          m.id === mediaItem.id ? { ...m, uploadProgress: progress } : m
        )
      );
    };

    const setUploadStatus = (status: UploadStatus, cloudflareId?: string, error?: string) => {
      setMedia((prev) =>
        prev.map((m) =>
          m.id === mediaItem.id ? { ...m, uploadStatus: status, cloudflareId, error } : m
        )
      );
    };

    setUploadStatus("uploading");

    try {
      let cloudflareId: string;
      if (mediaItem.type === "video") {
        cloudflareId = await uploadVideoToCloudflare(mediaItem.file, updateProgress);
      } else {
        cloudflareId = await uploadImageToCloudflare(mediaItem.file, updateProgress);
      }
      setUploadStatus("complete", cloudflareId);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Upload failed";
      setUploadStatus("error", undefined, errorMessage);
    }
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
      newMedia.push({
        id,
        file,
        preview,
        type,
        uploadStatus: "pending",
        uploadProgress: 0,
      });
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

  const hasUploadErrors = media.some((m) => m.uploadStatus === "error");
  const isAnyUploading = media.some((m) => m.uploadStatus === "uploading");
  const allUploadsComplete = media.length > 0 && media.every((m) => m.uploadStatus === "complete");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (media.length === 0) return;

    setIsUploading(true);
    setError(null);

    try {
      // Start all uploads and wait for them to complete
      const uploadPromises = media.map((item) => uploadFileToCloudflare(item));
      await Promise.all(uploadPromises);

      // Check if any uploads failed (re-read state after uploads)
      // We need to get the updated media with cloudflareIds
      // Since state updates are async, we'll collect results differently
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
      setIsUploading(false);
      return;
    }
  };

  // Effect to create post after all uploads complete
  useEffect(() => {
    const createPost = async () => {
      if (!isUploading || !allUploadsComplete) return;
      if (hasUploadErrors) {
        setError("Some files failed to upload. Please remove them and try again.");
        setIsUploading(false);
        return;
      }

      // Build media data with Cloudflare IDs
      const mediaData = media
        .filter((item) => item.cloudflareId)
        .map((item) => ({
          cloudflareId: item.cloudflareId as string,
          type: item.type,
        }));

      if (mediaData.length === 0) {
        setError("No files were uploaded successfully");
        setIsUploading(false);
        return;
      }

      try {
        const response = await fetch("/api/posts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            media: mediaData,
            title,
            description,
            categories: selectedCategories,
          }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Failed to create post");
        }

        // Clean up previews
        media.forEach((item) => {
          URL.revokeObjectURL(item.preview);
        });

        router.push("/");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
        setIsUploading(false);
      }
    };

    createPost();
  }, [allUploadsComplete, hasUploadErrors, isUploading, media, title, description, selectedCategories, router]);

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
              Images up to 10MB · Videos up to 100MB · Max {MAX_MEDIA} files
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

                {/* Upload progress overlay */}
                {item.uploadStatus === "uploading" && (
                  <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-2">
                    <Loader2 className="w-6 h-6 animate-spin text-white" />
                    <span className="text-white text-sm font-medium">
                      {item.uploadProgress}%
                    </span>
                    <div className="w-3/4 h-1.5 bg-white/30 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary-500 transition-all duration-300"
                        style={{ width: `${item.uploadProgress}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Upload error overlay */}
                {item.uploadStatus === "error" && (
                  <div className="absolute inset-0 bg-error-500/80 flex flex-col items-center justify-center gap-2 p-2">
                    <X className="w-6 h-6 text-white" />
                    <span className="text-white text-xs text-center">
                      {item.error || "Upload failed"}
                    </span>
                  </div>
                )}

                {/* Upload complete indicator */}
                {item.uploadStatus === "complete" && (
                  <div className="absolute bottom-2 left-2 p-1 bg-green-500 rounded-full">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                )}

                {/* Video indicator */}
                {item.type === "video" && item.uploadStatus !== "uploading" && (
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
        {isUploading && allUploadsComplete ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Creating post...
          </>
        ) : isUploading || isAnyUploading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Uploading files...
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
