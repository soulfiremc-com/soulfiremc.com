import { relations, sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  // biome-ignore lint/suspicious/noDeprecatedImports: The object overload used below is the current Drizzle API.
  primaryKey,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
import { user } from "./auth-schema";

const reviewCommentStatuses = ["approved", "pending", "rejected"] as const;

const reviewItemTypes = ["account", "proxy", "resource"] as const;

export const review = sqliteTable(
  "review",
  {
    id: text("id")
      .$defaultFn(() => crypto.randomUUID())
      .primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    itemType: text("item_type", { enum: reviewItemTypes }).notNull(),
    itemSlug: text("item_slug").notNull(),
    rating: integer("rating").notNull().default(5),
    body: text("body"),
    commentStatus: text("comment_status", { enum: reviewCommentStatuses }),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
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
      "review_item_type_check",
      sql`${table.itemType} IN ('account', 'proxy', 'resource')`,
    ),
    check(
      "review_comment_status_check",
      sql`${table.commentStatus} IN ('approved', 'pending', 'rejected')`,
    ),
    check(
      "review_rating_range",
      sql`typeof(${table.rating}) = 'integer' AND ${table.rating} >= 1 AND ${table.rating} <= 5`,
    ),
  ],
);

export const reviewItemOwner = sqliteTable(
  "review_item_owner",
  {
    itemType: text("item_type", { enum: reviewItemTypes }).notNull(),
    itemSlug: text("item_slug").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`),
  },
  (table) => [
    primaryKey({ columns: [table.itemType, table.itemSlug, table.userId] }),
    index("review_item_owner_user_idx").on(table.userId),
    check(
      "review_item_owner_type_check",
      sql`${table.itemType} IN ('account', 'proxy', 'resource')`,
    ),
  ],
);

export const reviewReply = sqliteTable(
  "review_reply",
  {
    id: text("id")
      .$defaultFn(() => crypto.randomUUID())
      .primaryKey(),
    reviewId: text("review_id")
      .notNull()
      .references(() => review.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
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
