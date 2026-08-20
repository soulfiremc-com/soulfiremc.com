import { relations, sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  pgEnum,
  pgTable,
  // biome-ignore lint/suspicious/noDeprecatedImports: Drizzle marks the legacy overload on this symbol as deprecated, but the object form used below is the current API.
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { user } from "./auth-schema";

export const reviewCommentStatus = pgEnum("review_comment_status", [
  "approved",
  "pending",
  "rejected",
]);

export const reviewItemType = pgEnum("review_item_type", [
  "account",
  "proxy",
  "resource",
]);

export const review = pgTable(
  "review",
  {
    id: uuid("id").default(sql`pg_catalog.gen_random_uuid()`).primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    itemType: reviewItemType("item_type").notNull(),
    itemSlug: text("item_slug").notNull(),
    rating: integer("rating").notNull().default(5),
    body: text("body"),
    commentStatus: reviewCommentStatus("comment_status"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("review_user_item_unique").on(
      table.userId,
      table.itemType,
      table.itemSlug,
    ),
    index("review_item_idx").on(table.itemType, table.itemSlug),
    index("review_item_created_idx").on(
      table.itemType,
      table.itemSlug,
      table.createdAt,
    ),
    index("review_comment_status_idx").on(table.commentStatus),
    check(
      "review_rating_range",
      sql`${table.rating} >= 1 AND ${table.rating} <= 5`,
    ),
  ],
);

export const reviewItemOwner = pgTable(
  "review_item_owner",
  {
    itemType: reviewItemType("item_type").notNull(),
    itemSlug: text("item_slug").notNull(),
    userId: uuid("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.itemType, table.itemSlug, table.userId] }),
    index("review_item_owner_user_idx").on(table.userId),
  ],
);

export const reviewReply = pgTable(
  "review_reply",
  {
    id: uuid("id").default(sql`pg_catalog.gen_random_uuid()`).primaryKey(),
    reviewId: uuid("review_id")
      .notNull()
      .references(() => review.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("review_reply_review_unique").on(table.reviewId),
    index("review_reply_user_idx").on(table.userId),
  ],
);

export const reviewRelations = relations(review, ({ one }) => ({
  user: one(user, {
    fields: [review.userId],
    references: [user.id],
  }),
}));

export const reviewItemOwnerRelations = relations(
  reviewItemOwner,
  ({ one }) => ({
    user: one(user, {
      fields: [reviewItemOwner.userId],
      references: [user.id],
    }),
  }),
);

export const reviewReplyRelations = relations(reviewReply, ({ one }) => ({
  review: one(review, {
    fields: [reviewReply.reviewId],
    references: [review.id],
  }),
  user: one(user, {
    fields: [reviewReply.userId],
    references: [user.id],
  }),
}));
