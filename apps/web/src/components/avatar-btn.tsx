import { X } from "lucide-react";
import { useRef, useState } from "react";
import { TooltipWrapper } from "./tooltip-wrapper";
import { useFeatureFlags } from "./feature-flags-provider";
import { cn } from "@/lib/utils";
import { SafeAvatar } from "./safe-avatar";
import { Button } from "./ui/button";

interface AvatarCompProps {
  fallback?: string | null;
  avatar?: string | null;
  className?: string;
  onUpload?: (file: File) => void;
  onRemove?: () => void;
  isUploading?: boolean;
  isDeleting?: boolean;
  isSquare?: boolean;
}

export function AvatarBtn({
  fallback,
  className,
  avatar,
  onRemove,
  onUpload,
  isUploading,
  isDeleting,
  isSquare = false,
}: AvatarCompProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [blobUrl, setBlobUrl] = useState<string | undefined>();
  const [content, setContent] = useState<string | null>(null);
  // Uploads need object storage; while the avatars flag is off the avatar is display-only.
  const uploadsEnabled = useFeatureFlags().avatars;
  const label = !uploadsEnabled
    ? "Avatar uploads are disabled"
    : avatar
      ? "Replace avatar"
      : "Add avatar";
  const openPicker = () => {
    if (uploadsEnabled) inputRef.current?.click();
  };

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];

    if (file) {
      setBlobUrl(URL.createObjectURL(file));
      onUpload?.(file);
    }
  }

  return (
    <TooltipWrapper sideOffset={3} content={content || label}>
      {/* oxlint-disable jsx-a11y/prefer-tag-over-role -- This composite control contains child controls, so it cannot be a native button. */}
      <div
        role="button"
        tabIndex={0}
        aria-label={label}
        aria-disabled={!uploadsEnabled || isUploading || isDeleting}
        onKeyDown={(event) => {
          if (
            event.target === event.currentTarget &&
            (event.key === "Enter" || event.key === " ")
          ) {
            event.preventDefault();
            openPicker();
          }
        }}
        className={cn(
          "group relative w-fit",
          uploadsEnabled ? "cursor-pointer" : "cursor-not-allowed",
          (isUploading || isDeleting) && "animate-pulse",
        )}
        onClick={openPicker}
      >
        <input
          onChange={handleFileChange}
          type="file"
          accept="image/*"
          ref={inputRef}
          className="absolute hidden"
          disabled={!uploadsEnabled || isUploading || isDeleting}
        />

        <SafeAvatar
          src={blobUrl || avatar}
          isBlob={!!blobUrl}
          className={cn("h-10 w-10", isSquare && "rounded-md", className)}
          fallbackClassName={cn(
            "text-2xl uppercase transition-all",
            isSquare && "rounded-md",
          )}
          fallback={fallback}
        />

        {avatar && uploadsEnabled && (
          <Button
            className={cn(
              "invisible absolute aspect-square rounded-full p-0.5 transition-all duration-100 group-hover:visible",
              isSquare ? "-right-1.5 -top-1.5" : "-right-0.5 -top-0.5",
            )}
            size="fit"
            variant="secondary"
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              setBlobUrl(undefined);
              if (inputRef.current) inputRef.current.value = "";
              onRemove?.();
            }}
            disabled={isDeleting}
            onMouseEnter={() => {
              setContent("Remove avatar");
            }}
            onMouseLeave={() => {
              setContent(null);
            }}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
      {/* oxlint-enable jsx-a11y/prefer-tag-over-role */}
    </TooltipWrapper>
  );
}
