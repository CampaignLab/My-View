import { ProfileEditor } from '../../components/profile-editor';
import { SetupNeeded } from '../../components/setup-needed';
export default function OnboardingPage() { return process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ? <ProfileEditor onboarding/> : <SetupNeeded/>; }
