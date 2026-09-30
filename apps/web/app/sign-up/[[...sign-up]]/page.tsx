import { SignUp } from '@clerk/nextjs';
import { SetupNeeded } from '../../../components/setup-needed';
export default function SignUpPage() { return process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ? <main className="min-h-screen flex items-center justify-center p-6"><SignUp fallbackRedirectUrl="/onboarding" signInUrl="/sign-in"/></main> : <SetupNeeded/>; }
