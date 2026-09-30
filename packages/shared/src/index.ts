import { z } from 'zod';

export const positions = ['strongly_agree', 'agree', 'mixed', 'disagree', 'strongly_disagree', 'unknown'] as const;
export const viewSchema = z.object({ topic: z.string().min(1).max(80), proposition: z.string().min(1).max(500), position: z.enum(positions), notes: z.string().max(1000).optional() });
export const styleSchema = z.object({ tone: z.enum(['conversational', 'friendly', 'detailed']).default('conversational'), length: z.enum(['short', 'medium', 'long']).default('short'), formality: z.enum(['informal', 'neutral', 'formal']).default('informal'), usesEmojis: z.boolean().default(false) });
export const profileSchema = z.object({ topics: z.array(z.string().max(80)).max(20), views: z.array(viewSchema).max(30), style: styleSchema });
export type Profile = z.infer<typeof profileSchema>;
export type UserView = z.infer<typeof viewSchema>;
export interface CapturedPost { platform: 'facebook'; url?: string; author?: string; postText: string; timestamp?: string; visibleComments?: string[] }
const facebookUrl = z.string().url().max(2000).refine(value => { const url = new URL(value); return url.protocol === 'https:' && (url.hostname === 'facebook.com' || url.hostname.endsWith('.facebook.com')); }, 'Use a Facebook URL');
export const postSchema = z.object({ text: z.string().trim().min(1).max(12000), author: z.string().max(200).optional(), url: facebookUrl.optional(), visibleComments: z.array(z.string().max(2000)).max(5).default([]) });
export const captureSchema = z.object({ captureId: z.string().uuid(), post: postSchema });
export const suggestSchema = captureSchema.extend({ instructions: z.string().max(1000).default(''), tone: z.enum(['short', 'friendly', 'detailed']).default('friendly'), regenerate: z.boolean().default(false) });
export const modelOutputSchema = z.object({ summary: z.string(), clarification: z.string().nullable(), conversational: z.string(), concise: z.string(), question: z.string() });
export const events = ['my_view_opened','post_captured','suggestion_generated','suggestion_selected','suggestion_regenerated','suggestion_edited','suggestion_copied','suggestion_inserted'] as const;
export const interactionSchema = z.object({
  event: z.enum(events), captureId: z.string().uuid().optional(), suggestionId: z.string().uuid().optional(),
  finalText: z.string().trim().min(1).max(5000).optional(),
});
export type InteractionInput = z.infer<typeof interactionSchema>;
export interface Suggestion { id: string; text: string; style: 'conversational' | 'short' | 'question' }
export interface SuggestResult { summary: string; clarification: string | null; suggestions: Suggestion[] }
export const defaultProfile: Profile = { topics: [], views: [], style: { tone: 'conversational', length: 'short', formality: 'informal', usesEmojis: false } };
export const topics = ['Housing','NHS','Economy','Climate','Local government','Education','Transport'];
export const propositions = [
  { topic: 'Housing', proposition: "Building substantially more homes is necessary to tackle Britain's housing shortage." },
  { topic: 'NHS', proposition: 'Improving access to NHS appointments should be a priority.' },
  { topic: 'Transport', proposition: 'Local public transport should receive more investment.' },
  { topic: 'Climate', proposition: 'Government should do more to reduce carbon emissions.' },
  { topic: 'Education', proposition: 'Schools should receive more public funding.' },
];
