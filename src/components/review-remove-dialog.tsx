"use client";

import { useT } from "@/lib/i18n-react";

import { Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

/** Confirm before deleting a review, because it also deletes its comment. */
export function ReviewRemoveDialog({
  open,
  onOpenChange,
  onConfirm,
  title,
  description,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  /** Defaults to the text for removing your own review. */
  title?: string;
  description?: string;
}) {
  const t = useT();

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogMedia>
            <Trash2 />
          </AlertDialogMedia>
          <AlertDialogTitle>
            {title ?? t("reviews.removeConfirm.title")}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {description ?? t("reviews.removeConfirm.description")}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
          <AlertDialogAction
            type="button"
            variant="destructive"
            onClick={() => {
              onOpenChange(false);
              onConfirm();
            }}
          >
            {t("reviews.removeReview")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
