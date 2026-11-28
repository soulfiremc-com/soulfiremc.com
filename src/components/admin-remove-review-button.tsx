"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ReviewRemoveDialog } from "@/components/review-remove-dialog";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useSession } from "@/lib/auth-hooks";
import { hasAdminRole } from "@/lib/auth/roles";
import { useT } from "@/lib/i18n-react";
import { removeReviewServerFn } from "@/lib/reviews-actions";

/** Lets an admin delete someone else's review, including its rating. */
export function AdminRemoveReviewButton({
  reviewId,
  onRemoved,
  size = "sm",
}: {
  reviewId: string;
  onRemoved?: () => void;
  size?: "sm" | "default";
}) {
  const t = useT();
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const removal = useMutation({
    mutationFn: async () => {
      const result = await removeReviewServerFn({ data: { reviewId } });
      if (!result.ok) throw new Error(result.error);
    },
    onError: () => {
      toast.error(t("admin.reviews.removeFailed"), {
        description: t("reviews.errors.connectionDescription"),
      });
    },
    onSuccess: () => {
      onRemoved?.();
      void queryClient.invalidateQueries({ queryKey: ["reviews"] });
      toast(t("reviews.reviewRemoved"));
    },
  });

  // The server checks the role again. This only hides the button.
  // The client session type does not include admin plugin fields.
  const role = session && "role" in session.user ? session.user.role : null;
  if (!hasAdminRole(typeof role === "string" ? role : null)) return null;

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size={size}
        onClick={() => {
          setConfirmOpen(true);
        }}
        disabled={removal.isPending}
      >
        {removal.isPending ? (
          <Spinner data-icon="inline-start" />
        ) : (
          <Trash2 data-icon="inline-start" />
        )}
        {t("admin.reviews.remove")}
      </Button>
      <ReviewRemoveDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        onConfirm={() => {
          removal.mutate();
        }}
        title={t("admin.reviews.removeConfirm.title")}
        description={t("admin.reviews.removeConfirm.description")}
      />
    </>
  );
}
