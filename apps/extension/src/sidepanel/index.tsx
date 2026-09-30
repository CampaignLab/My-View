import React, { useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import { ClerkProvider, SignIn, SignUp, useAuth, useUser, useClerk } from '@clerk/chrome-extension';
import { Logo, Button } from '@my-view/ui';
import { Panel } from './panel';
const panelUrl = chrome.runtime.getURL('sidepanel.html');
function AuthenticatedApp() {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const { user } = useUser();
  const { signOut } = useClerk();
  const token = useCallback(() => getToken(), [getToken]);
  const [signUp, setSignUp] = React.useState(location.hash === '#sign-up');
  React.useEffect(() => {
    const onHash = () => { if (location.hash.startsWith('#sign-up')) setSignUp(true); else if (location.hash.startsWith('#sign-in')) setSignUp(false); };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);
  if (!isLoaded) return <div className="p-8"><Logo /><p className="mt-6 text-sm text-stone-500">Connecting your account…</p></div>;
  if (!isSignedIn) return <main className="p-5"><Logo /><h1 className="mt-8 text-2xl font-semibold">A little help joining in.</h1><p className="mt-3 mb-6 text-sm leading-6 text-stone-600">Sign into My View once. Your Facebook account stays separate.</p>{signUp ? <SignUp routing="hash" signInUrl={`${panelUrl}#sign-in`} fallbackRedirectUrl={panelUrl} /> : <SignIn routing="hash" signUpUrl={`${panelUrl}#sign-up`} fallbackRedirectUrl={panelUrl} />}<Button className="mt-4" variant="ghost" onClick={() => setSignUp(!signUp)}>{signUp ? 'Already have an account? Sign in' : 'New here? Create an account'}</Button></main>;
  return <Panel getToken={token} account={user?.primaryEmailAddress?.emailAddress || 'Signed in'} onSignOut={async () => { await chrome.storage.session.remove(['capture','draft','captureError']); await signOut(); }} />;
}
function App() {
  if (!__CLERK_KEY__) return <Panel getToken={async () => null} account="Account setup pending" />;
  return <ClerkProvider publishableKey={__CLERK_KEY__} allowedRedirectProtocols={['chrome-extension:']} afterSignOutUrl={panelUrl} signInFallbackRedirectUrl={panelUrl} signUpFallbackRedirectUrl={panelUrl}><AuthenticatedApp /></ClerkProvider>;
}
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? <div className="p-6"><Logo /><p className="mt-6 text-sm">My View could not load. Reopen the panel. If sign-in still fails, check the Clerk extension setup in the README.</p></div> : this.props.children; }
}
createRoot(document.getElementById('root')!).render(<ErrorBoundary><App /></ErrorBoundary>);
