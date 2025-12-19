import { UploadForm } from "@/components/create/upload-form";
import { Navbar } from "@/components/layout/navbar";

export default function CreatePage() {
  return (
    <div className="min-h-screen bg-bg-base">
      <Navbar />

      <main className="pt-24 pb-12">
        <div className="max-w-2xl mx-auto px-6">
          <h1 className="text-3xl font-bold text-text-primary mb-8">
            Create Post
          </h1>

          <UploadForm />
        </div>
      </main>
    </div>
  );
}
