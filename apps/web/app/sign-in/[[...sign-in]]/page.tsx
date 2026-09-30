import { SignIn } from '@clerk/nextjs';
import { SetupNeeded } from '../../../components/setup-needed';
export default function SignInPage() { return process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ? <main className="min-h-screen flex items-center justify-center p-6"><SignIn fallbackRedirectUrl="/onboarding" signUpUrl="/sign-up"/></main> : <SetupNeeded/>; }
