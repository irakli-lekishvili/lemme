"use client";

import { createClient } from "@/lib/supabase/client";
import { Check, GripVertical, ImagePlus, Loader2, Plus, Upload, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

type Category = {
  id: string;
  name: string;
  slug: string;
  color: string | null;
};

type ImageFile = {
  id: string;
  file: File;
  preview: string;
};

const MAX_IMAGES = 10;

export function UploadForm() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [images, setImages] = useState<ImageFile[]>([]);
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

  const validateFile = useCallback((file: File): string | null => {
    const validTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!validTypes.includes(file.type)) {
      return "Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.";
    }

    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return "File too large. Maximum size is 10MB.";
    }

    return null;
  }, []);

  const handleFiles = useCallback((selectedFiles: FileList | File[]) => {
    const filesArray = Array.from(selectedFiles);
    const remainingSlots = MAX_IMAGES - images.length;

    if (filesArray.length > remainingSlots) {
      setError(`You can only add ${remainingSlots} more image${remainingSlots !== 1 ? 's' : ''}. Maximum is ${MAX_IMAGES}.`);
      return;
    }

    const newImages: ImageFile[] = [];
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
      newImages.push({ id, file, preview });
    }

    if (!hasError) {
      setError(null);
      setImages((prev) => [...prev, ...newImages]);
    }
  }, [images.length, validateFile]);

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

  const removeImage = useCallback((id: string) => {
    setImages((prev) => {
      const image = prev.find((img) => img.id === id);
      if (image) {
        URL.revokeObjectURL(image.preview);
      }
      return prev.filter((img) => img.id !== id);
    });
    setError(null);
  }, []);

  // Drag and drop reordering
  const handleImageDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleImageDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    setImages((prev) => {
      const newImages = [...prev];
      const draggedImage = newImages[draggedIndex];
      newImages.splice(draggedIndex, 1);
      newImages.splice(index, 0, draggedImage);
      return newImages;
    });
    setDraggedIndex(index);
  };

  const handleImageDragEnd = () => {
    setDraggedIndex(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (images.length === 0) return;

    setIsUploading(true);
    setError(null);

    const formData = new FormData();
    images.forEach((img, index) => {
      formData.append(`file_${index}`, img.file);
    });
    formData.append("fileCount", images.length.toString());
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
      images.forEach((img) => {
        URL.revokeObjectURL(img.preview);
      });

      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsUploading(false);
    }
  };

  const clearAllImages = () => {
    images.forEach((img) => {
      URL.revokeObjectURL(img.preview);
    });
    setImages([]);
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
      {images.length === 0 ? (
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
            accept="image/jpeg,image/png,image/gif,image/webp"
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
                Drop your images here
              </p>
              <p className="text-sm text-text-muted mt-1">
                or click to browse
              </p>
            </div>
            <p className="text-xs text-text-muted">
              JPEG, PNG, GIF, WebP up to 10MB · Max {MAX_IMAGES} images
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Image Preview Grid */}
          <ul className="grid grid-cols-2 sm:grid-cols-3 gap-3 list-none p-0 m-0">
            {images.map((img, index) => (
              <li
                key={img.id}
                draggable
                onDragStart={() => handleImageDragStart(index)}
                onDragOver={(e) => handleImageDragOver(e, index)}
                onDragEnd={handleImageDragEnd}
                className={`relative group rounded-lg overflow-hidden bg-bg-elevated aspect-square ${
                  draggedIndex === index ? "opacity-50" : ""
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.preview}
                  alt={`Preview ${index + 1}`}
                  className="w-full h-full object-cover"
                />

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
                  onClick={() => removeImage(img.id)}
                  className="absolute top-2 right-2 p-1.5 bg-bg-base/80 backdrop-blur-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-bg-hover"
                >
                  <X className="w-4 h-4 text-text-primary" />
                </button>

                {/* First image indicator */}
                {index === 0 && (
                  <div className="absolute bottom-2 left-2 px-2 py-1 bg-primary-500/90 backdrop-blur-sm rounded text-[10px] font-medium text-white">
                    Cover
                  </div>
                )}
              </li>
            ))}

            {/* Add more button */}
            {images.length < MAX_IMAGES && (
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
                    accept="image/jpeg,image/png,image/gif,image/webp"
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
              onClick={clearAllImages}
              className="text-sm text-text-muted hover:text-text-primary transition-colors"
            >
              Clear all
            </button>
          </div>

          {/* Reorder hint */}
          <p className="text-xs text-text-muted text-center">
            Drag images to reorder · First image is the cover
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
        disabled={images.length === 0 || selectedCategories.length === 0 || isUploading}
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
            Publish {images.length > 1 ? `(${images.length} images)` : ""}
          </>
        )}
      </button>
    </form>
  );
}
