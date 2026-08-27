import { PageHeader } from "@/components/shared/page-header";
import { CaptureForm } from "@/components/capture/capture-form";

export const metadata = { title: "Capture Job" };

export default function CapturePage() {
  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="1-Click Job Capture"
        description="Drag the Workly Button to your bookmarks bar. Click it on any job posting (LinkedIn, Indeed, etc.) to instantly import it."
      />

      <div className="w-full">
        <CaptureForm />
      </div>
    </div>
  );
}
