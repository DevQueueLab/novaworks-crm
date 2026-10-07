"use client";

import { Loader2, Trash2, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { Avatar as AvatarPrimitive } from "radix-ui";
import { useEffect, useRef, useState, useTransition, type ChangeEvent, type DragEvent } from "react";
import { toast } from "sonner";

import {
  clearUserAvatar,
  removeMyAvatar,
  setUserAvatar,
  uploadMyAvatar,
  type AvatarActionResult,
} from "@/actions/avatar";
import { avatarColor, avatarSrc } from "@/components/people";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { initials } from "@/lib/format";
import { cn } from "@/lib/utils";

const ACCEPT = "image/png,image/jpeg,image/webp";
const ACCEPTED_TYPES = ACCEPT.split(",");
/** Largest original we will try to decode; the upload itself is a small 256px square. */
const MAX_SOURCE_BYTES = 10 * 1024 * 1024;
/** Server limit (512 KB). A 256px WebP or JPEG is typically 10 to 40 KB. */
const MAX_UPLOAD_BYTES = 512 * 1024;
const OUTPUT_SIZE = 256;
const QUALITY = 0.85;

const OFFLINE = { ok: false, message: "Could not reach the server. Please try again." } as const;

type ImageStatus = "idle" | "loading" | "loaded" | "error";
/** What this panel shows until the next action: a fresh local photo, or nothing after a removal. */
type LocalPhoto = { kind: "preview"; url: string } | { kind: "removed" } | null;

async function safely(action: () => Promise<AvatarActionResult>): Promise<AvatarActionResult> {
  try {
    return await action();
  } catch {
    return OFFLINE;
  }
}

function problemWith(file: File) {
  // Some systems report no type at all; decoding decides for those.
  if (file.type && !ACCEPTED_TYPES.includes(file.type)) return "Choose a PNG, JPEG or WebP image.";
  if (file.size > MAX_SOURCE_BYTES) return "That image is over 10 MB. Choose a smaller one.";
  return null;
}

function createCanvas(size: number) {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  return canvas;
}

function context2d(canvas: HTMLCanvasElement) {
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas is not available");
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  return context;
}

/** Centre-crops to a square and scales to 256px, halving large photos in steps so they stay sharp. */
function cropToSquare(image: HTMLImageElement) {
  let side = Math.min(image.naturalWidth, image.naturalHeight);
  let source: CanvasImageSource = image;
  let sx = (image.naturalWidth - side) / 2;
  let sy = (image.naturalHeight - side) / 2;

  while (side >= OUTPUT_SIZE * 4) {
    const half = Math.round(side / 2);
    const step = createCanvas(half);
    context2d(step).drawImage(source, sx, sy, side, side, 0, 0, half, half);
    source = step;
    sx = 0;
    sy = 0;
    side = half;
  }

  const canvas = createCanvas(OUTPUT_SIZE);
  context2d(canvas).drawImage(source, sx, sy, side, side, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
  return canvas;
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string) {
  return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, QUALITY));
}

/** Decodes the file in the browser and re-encodes it as a 256px square WebP (JPEG where WebP can't be encoded). */
async function toAvatarBlob(file: Blob): Promise<Blob> {
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    if (!image.naturalWidth || !image.naturalHeight) throw new Error("Empty image");

    const square = cropToSquare(image);
    const webp = await canvasToBlob(square, "image/webp");
    // Browsers that can't encode WebP hand back a PNG instead.
    if (webp?.type === "image/webp") return webp;

    // JPEG has no transparency, so flatten onto white first.
    const flat = createCanvas(OUTPUT_SIZE);
    const context = context2d(flat);
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
    context.drawImage(square, 0, 0);
    const jpeg = await canvasToBlob(flat, "image/jpeg");
    if (!jpeg) throw new Error("Could not encode the image");
    return jpeg;
  } finally {
    URL.revokeObjectURL(url);
  }
}

const hasFiles = (event: DragEvent) => Array.from(event.dataTransfer.types).includes("Files");

type AvatarUploadProps = {
  name: string;
  code: string;
  /** Photo timestamp from the server: null when there is no photo, omitted when unknown. */
  version?: number | null;
  /** Admin mode: change this user's photo instead of the signed-in user's. */
  userId?: string;
  className?: string;
};

/**
 * Profile photo picker with drag and drop. Photos are cropped and resized in the
 * browser, so only a small square ever reaches the server.
 */
export function AvatarUpload(props: AvatarUploadProps) {
  // A different person gets fresh local state, e.g. when an admin sheet is reused.
  return <AvatarUploadPanel key={props.userId ?? props.code} {...props} />;
}

function AvatarUploadPanel({ name, code, version, userId, className }: AvatarUploadProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const dragDepth = useRef(0);
  const [pending, startTransition] = useTransition();
  const [action, setAction] = useState<"upload" | "remove">("upload");
  const [local, setLocal] = useState<LocalPhoto>(null);
  const [dragging, setDragging] = useState(false);
  const [imageStatus, setImageStatus] = useState<ImageStatus>("idle");

  const previewUrl = local?.kind === "preview" ? local.url : null;
  useEffect(() => {
    if (!previewUrl) return;
    return () => URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  const serverSrc = local === null && version !== null ? avatarSrc(code, version) : null;
  const hasPhoto =
    local !== null
      ? local.kind === "preview"
      : typeof version === "number" || (version === undefined && imageStatus === "loaded");
  const isSelf = userId === undefined;
  const uploading = pending && action === "upload";
  const removing = pending && action === "remove";

  function upload(file: File) {
    if (pending) return;
    const problem = problemWith(file);
    if (problem) {
      toast.error(problem);
      return;
    }

    setAction("upload");
    startTransition(async () => {
      let blob: Blob;
      try {
        blob = await toAvatarBlob(file);
      } catch {
        toast.error("That image could not be read. Try a different PNG, JPEG or WebP file.");
        return;
      }
      if (blob.size > MAX_UPLOAD_BYTES) {
        toast.error("That photo is too detailed to store. Try a different one.");
        return;
      }

      setLocal({ kind: "preview", url: URL.createObjectURL(blob) });

      const formData = new FormData();
      formData.append("file", blob, blob.type === "image/webp" ? "avatar.webp" : "avatar.jpg");
      const result = await safely(() => (userId ? setUserAvatar(userId, formData) : uploadMyAvatar(formData)));
      if (!result.ok) {
        setLocal(null);
        toast.error(result.message);
        return;
      }
      toast.success(isSelf ? "Profile photo updated" : `Photo updated for ${name}`);
      router.refresh();
    });
  }

  function remove() {
    if (pending) return;
    setAction("remove");
    startTransition(async () => {
      const result = await safely(() => (userId ? clearUserAvatar(userId) : removeMyAvatar()));
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      setLocal({ kind: "removed" });
      toast.success(isSelf ? "Profile photo removed" : `Photo removed for ${name}`);
      router.refresh();
    });
  }

  function onPick(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    // Clear the input so choosing the same file again still fires a change.
    event.target.value = "";
    if (file) upload(file);
  }

  function onDragEnter(event: DragEvent<HTMLDivElement>) {
    if (!hasFiles(event)) return;
    event.preventDefault();
    dragDepth.current += 1;
    setDragging(true);
  }

  function onDragOver(event: DragEvent<HTMLDivElement>) {
    if (!hasFiles(event)) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = pending ? "none" : "copy";
  }

  function onDragLeave(event: DragEvent<HTMLDivElement>) {
    if (!hasFiles(event)) return;
    dragDepth.current = Math.max(0, dragDepth.current - 1);
    if (dragDepth.current === 0) setDragging(false);
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    if (!hasFiles(event)) return;
    event.preventDefault();
    dragDepth.current = 0;
    setDragging(false);
    const file = event.dataTransfer.files[0];
    if (file) upload(file);
  }

  return (
    <div
      onDragEnter={onDragEnter}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={cn(
        "flex flex-col gap-5 rounded-xl border border-dashed p-5 transition-colors duration-150 sm:flex-row sm:items-center",
        dragging && !pending ? "border-primary/60 bg-accent/40" : "border-border",
        className,
      )}
    >
      <AvatarPrimitive.Root className="relative flex size-20 shrink-0 overflow-hidden rounded-full select-none sm:size-24">
        {previewUrl ? (
          // A local object URL: next/image can't optimise it, and it should show instantly.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={previewUrl} alt="" className="size-full object-cover" />
        ) : (
          <>
            {serverSrc && (
              <AvatarPrimitive.Image
                src={serverSrc}
                alt=""
                className="size-full object-cover"
                onLoadingStatusChange={setImageStatus}
              />
            )}
            <AvatarPrimitive.Fallback
              className={cn(
                "flex size-full items-center justify-center rounded-full text-2xl font-semibold",
                avatarColor(code),
              )}
            >
              {initials(name)}
            </AvatarPrimitive.Fallback>
          </>
        )}
        {pending && (
          <span className="absolute inset-0 flex items-center justify-center rounded-full bg-background/60">
            <Loader2 className="size-5 animate-spin text-foreground/70" aria-hidden />
          </span>
        )}
      </AvatarPrimitive.Root>

      <div className="min-w-0 flex-1 space-y-3">
        <div className="space-y-1">
          <p className="text-sm font-medium">
            {dragging && !pending ? "Drop to upload" : "Drag a photo here or choose a file"}
          </p>
          <p className="text-sm leading-6 text-muted-foreground text-pretty">
            PNG, JPEG or WebP up to 10 MB. It is cropped to a square and resized to 256 pixels.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" size="sm" disabled={pending} onClick={() => inputRef.current?.click()}>
            {uploading ? <Loader2 className="animate-spin" /> : <Upload />}
            {uploading ? "Uploading…" : "Upload photo"}
          </Button>

          {(hasPhoto || removing) && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button type="button" variant="outline" size="sm" disabled={pending}>
                  {removing ? <Loader2 className="animate-spin" /> : <Trash2 />}
                  {removing ? "Removing…" : "Remove photo"}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{isSelf ? "Remove your photo?" : `Remove ${name}'s photo?`}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {isSelf ? "Teammates will see your initials instead." : "Teammates will see their initials instead."}{" "}
                    A new photo can be uploaded at any time.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction variant="destructive" onClick={remove}>
                    Remove photo
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>

      <input ref={inputRef} type="file" accept={ACCEPT} hidden onChange={onPick} />
    </div>
  );
}
