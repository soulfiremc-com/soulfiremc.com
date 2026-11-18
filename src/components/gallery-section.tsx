import type { MessageKey } from "@/lib/messages";
import { useT } from "@/lib/i18n-react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useState } from "react";
import { Image } from "@/components/image";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";

export function GallerySection({
  images,
}: {
  images: { src: string; alt: MessageKey }[];
}) {
  const t = useT();
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const openImage = openIndex === null ? undefined : images[openIndex];

  const prev = () =>
    setOpenIndex((i) =>
      i !== null ? (i - 1 + images.length) % images.length : null,
    );
  const next = () =>
    setOpenIndex((i) => (i !== null ? (i + 1) % images.length : null));

  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-2xl font-semibold">{t("gallery.title")}</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {images.map((img, i) => (
          <button
            key={img.src}
            type="button"
            onClick={() => setOpenIndex(i)}
            className="relative aspect-video overflow-hidden rounded-lg bg-muted ring-offset-background transition-shadow hover:ring-2 hover:ring-ring hover:ring-offset-2 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
          >
            <Image
              src={img.src}
              alt={t(img.alt)}
              fill
              sizes="(min-width: 640px) 33vw, 50vw"
              objectFit="cover"
              className="size-full object-cover"
            />
          </button>
        ))}
      </div>

      <Dialog
        open={openIndex !== null}
        onOpenChange={(open) => !open && setOpenIndex(null)}
      >
        <DialogContent
          showCloseButton={false}
          className="flex h-[calc(100dvh-1rem)] max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-[calc(100vw-1rem)] flex-col gap-0 overflow-hidden border-white/10 bg-black/90 p-2 shadow-2xl sm:h-[calc(100dvh-3rem)] sm:max-h-[calc(100dvh-3rem)] sm:w-[calc(100vw-3rem)] sm:max-w-[calc(100vw-3rem)] sm:p-4"
        >
          <DialogTitle className="sr-only">
            {t(openImage?.alt ?? "gallery.image")}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {t("gallery.position", {
              current: openIndex !== null ? openIndex + 1 : 0,
              count: images.length,
            })}
          </DialogDescription>
          {openIndex !== null && openImage && (
            <div className="relative min-h-0 flex-1 overflow-hidden rounded-lg bg-black/40">
              <Image
                loading="eager"
                src={openImage.src}
                alt={t(openImage.alt)}
                fill
                className="size-full object-contain"
              />
              <DialogClose
                render={
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-3 right-3 z-10 size-11 rounded-full border border-white/10 bg-black/65 text-white hover:bg-black/80 hover:text-white"
                  >
                    <X className="size-5" />
                    <span className="sr-only">{t("gallery.closeGallery")}</span>
                  </Button>
                }
              />
              {images.length > 1 && (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={prev}
                    className="absolute top-1/2 left-3 z-10 size-11 -translate-y-1/2 rounded-full border border-white/10 bg-black/65 text-white hover:bg-black/80 hover:text-white"
                  >
                    <ChevronLeft className="size-5" />
                    <span className="sr-only">
                      {t("gallery.previousImage")}
                    </span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={next}
                    className="absolute top-1/2 right-3 z-10 size-11 -translate-y-1/2 rounded-full border border-white/10 bg-black/65 text-white hover:bg-black/80 hover:text-white"
                  >
                    <ChevronRight className="size-5" />
                    <span className="sr-only">{t("gallery.nextImage")}</span>
                  </Button>
                </>
              )}
              <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 bg-linear-to-t from-black/85 via-black/30 to-transparent p-3 sm:p-4">
                <p className="max-w-[75%] text-sm text-white/80">
                  {t(openImage.alt)}
                </p>
                <span className="rounded-full border border-white/10 bg-black/60 px-3 py-1 text-xs font-medium text-white/75">
                  {openIndex + 1} / {images.length}
                </span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
