import { pgTable, pgEnum, uuid, text, timestamp, boolean, primaryKey, index, integer, jsonb } from 'drizzle-orm/pg-core';
const created = () => timestamp('created_at', { withTimezone: true }).defaultNow().notNull();
export const positionEnum = pgEnum('view_position', ['strongly_agree','agree','mixed','disagree','strongly_disagree','unknown']);
export const statusEnum = pgEnum('suggestion_status', ['generated','copied','inserted','dismissed']);
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(), clerkUserId: text('clerk_user_id').notNull().unique(), email: text('email'),
  topics: jsonb('topics').$type<string[]>().default([]).notNull(), createdAt: created(),
});
export const organisations = pgTable('organisations', { id: uuid('id').primaryKey().defaultRandom(), name: text('name').notNull(), createdAt: created() });
export const cohorts = pgTable('cohorts', { id: uuid('id').primaryKey().defaultRandom(), organisationId: uuid('organisation_id').notNull().references(() => organisations.id, { onDelete: 'cascade' }), name: text('name').notNull(), createdAt: created() });
export const cohortMembers = pgTable('cohort_members', {
  cohortId: uuid('cohort_id').notNull().references(() => cohorts.id, { onDelete: 'cascade' }), userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }), joinedAt: timestamp('joined_at', { withTimezone: true }).defaultNow().notNull(),
}, t => [primaryKey({ columns: [t.cohortId, t.userId] })]);
export const userViews = pgTable('user_views', {
  id: uuid('id').primaryKey().defaultRandom(), userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }), topic: text('topic').notNull(), proposition: text('proposition').notNull(), position: positionEnum('position').notNull(), notes: text('notes'),
}, t => [index('views_user_idx').on(t.userId)]);
export const userStylePreferences = pgTable('user_style_preferences', {
  userId: uuid('user_id').primaryKey().references(() => users.id, { onDelete: 'cascade' }), tone: text('tone').default('conversational').notNull(), length: text('length').default('short').notNull(), formality: text('formality').default('informal').notNull(), usesEmojis: boolean('uses_emojis').default(false).notNull(),
});
export const capturedPosts = pgTable('captured_posts', {
  id: uuid('id').primaryKey(), userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }), platform: text('platform').default('facebook').notNull(), sourceUrl: text('source_url'), author: text('author'), text: text('text'), capturedAt: timestamp('captured_at', { withTimezone: true }).defaultNow().notNull(),
}, t => [index('captures_user_idx').on(t.userId)]);
export const suggestions = pgTable('suggestions', {
  id: uuid('id').primaryKey().defaultRandom(), userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }), capturedPostId: uuid('captured_post_id').notNull().references(() => capturedPosts.id, { onDelete: 'cascade' }),
  generatedText: text('generated_text'), finalText: text('final_text'), variant: text('variant').notNull(), status: statusEnum('status').default('generated').notNull(), createdAt: created(),
}, t => [index('suggestions_user_idx').on(t.userId, t.createdAt)]);
export const interactions = pgTable('interactions', {
  id: uuid('id').primaryKey().defaultRandom(), userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }), capturedPostId: uuid('captured_post_id').references(() => capturedPosts.id, { onDelete: 'cascade' }), suggestionId: uuid('suggestion_id').references(() => suggestions.id, { onDelete: 'cascade' }), event: text('event').notNull(), editDistance: integer('edit_distance'), createdAt: created(),
}, t => [index('interactions_user_idx').on(t.userId, t.createdAt)]);
