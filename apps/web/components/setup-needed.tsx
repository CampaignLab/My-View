import Link from 'next/link';
import { Logo } from '@my-view/ui';
export function SetupNeeded() { return <main className="max-w-lg mx-auto p-8"><Logo/><h1 className="text-3xl font-semibold mt-10">Account setup is pending.</h1><p className="mt-4 text-stone-600 leading-7">My View’s sign-in service has not been connected yet. Add the Clerk keys to the server environment and the public key to the extension build to enable accounts.</p><Link href="/" className="inline-block mt-6 text-teal-800">Back to My View</Link></main>; }
