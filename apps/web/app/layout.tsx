import type { Metadata } from 'next';
import { ClerkProvider } from '@clerk/nextjs';
import '@my-view/ui/styles.css';
export const metadata: Metadata = { title: 'My View — Join the conversation', description: 'A little help expressing your own views in Facebook discussions.' };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  const content = <html lang="en"><body>{children}</body></html>;
  return process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ? <ClerkProvider>{content}</ClerkProvider> : content;
}
