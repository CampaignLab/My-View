'use client';
import { useEffect, useState } from 'react';
import { useAuth, useUser, UserButton } from '@clerk/nextjs';
import Link from 'next/link';
import { ArrowRight, Check, ChevronLeft } from 'lucide-react';
import { Button, Logo, cn } from '@my-view/ui';
import { defaultProfile, propositions, topics, type Profile, type UserView } from '@my-view/shared';
export function ProfileEditor({ onboarding = false }: { onboarding?: boolean }) {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const { user } = useUser();
  const [profile, setProfile] = useState<Profile>(defaultProfile);
  const [step, setStep] = useState(onboarding ? 0 : 1);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  useEffect(() => {
    if (!isSignedIn) return;
    let disposed = false;
    void (async () => {
      try {
        const token = await getToken(); const response = await fetch('/api/profile', { headers: { Authorization: `Bearer ${token}` } }); const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        if (!disposed) { setProfile(data); setLoaded(true); }
      } catch (e) { if (!disposed) setError(e instanceof Error ? e.message : 'Could not load preferences.'); }
    })();
    return () => { disposed = true; };
  }, [isSignedIn, getToken]);
  function updateView(proposition: typeof propositions[number], position: UserView['position']) {
    setProfile(p => ({ ...p, views: [...p.views.filter(v => v.proposition !== proposition.proposition), { ...proposition, position }] }));
  }
  async function save() {
    setSaving(true); setError(''); setMessage('');
    try {
      const token = await getToken(); const response = await fetch('/api/profile', { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(profile) }); const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      if (onboarding) setStep(3); else setMessage('Your preferences are saved.');
    } catch (e) { setError(e instanceof Error ? e.message : 'Save failed.'); } finally { setSaving(false); }
  }
  if (!isLoaded) return <p className="p-8">Loading your account…</p>;
  if (!isSignedIn) return <main className="max-w-lg mx-auto p-8"><Logo/><h1 className="text-3xl mt-10 font-semibold">Make My View yours.</h1><p className="mt-4 text-stone-500">Sign in to save your preferences.</p><Button asChild className="mt-6"><Link href="/sign-in">Sign in<ArrowRight size={16}/></Link></Button></main>;
  return <main className="max-w-2xl mx-auto px-6 py-8"><header className="flex justify-between items-center"><Link href="/"><Logo/></Link><UserButton/></header><p className="eyebrow mt-12">{onboarding ? `Getting started · ${step+1} of 4` : user?.firstName ? `${user.firstName}’s My View` : 'My preferences'}</p>
    {step === 0 && <section><h1 className="text-4xl font-semibold mt-4">A little help joining in.</h1><p className="text-stone-500 leading-8 mt-5">My View helps you join conversations you care about without starting every response from scratch. Tell us what matters to you, or skip any question.</p><Button className="mt-7" onClick={() => setStep(1)}>Continue<ArrowRight size={16}/></Button></section>}
    {(step === 1 || !onboarding) && <section><h1 className="text-3xl font-semibold mt-4">What do you care about?</h1><p className="text-sm leading-7 mt-3 text-stone-500">Choose topics you’re interested in. This doesn’t tell us what you believe about them.</p><div className="flex flex-wrap gap-3 mt-6">{topics.map(t => <Button key={t} variant={profile.topics.includes(t) ? 'default' : 'outline'} onClick={() => setProfile(p => ({ ...p, topics: p.topics.includes(t) ? p.topics.filter(x => x !== t) : [...p.topics,t] }))} aria-pressed={profile.topics.includes(t)}>{profile.topics.includes(t) && <Check size={14}/>} {t}</Button>)}</div>{onboarding && <Button className="mt-8" onClick={() => setStep(2)}>Continue<ArrowRight size={16}/></Button>}</section>}
    {(step === 2 || !onboarding) && <section className="mt-8"><h2 className="text-2xl font-semibold">What’s your view?</h2><p className="text-sm text-stone-500 mt-3 leading-7">These questions are optional. Saved views are private to you. You can change them whenever you like.</p><div className="space-y-4 mt-5">{propositions.map(p => <div className="card" key={p.proposition}><p className="eyebrow">{p.topic}</p><p className="mt-2 text-sm leading-6">{p.proposition}</p><div className="flex flex-wrap gap-2 mt-4">{(['agree','mixed','disagree','unknown'] as const).map(position => <Button key={position} size="sm" variant={(profile.views.find(v => v.proposition === p.proposition)?.position || 'unknown') === position ? 'default' : 'outline'} onClick={() => updateView(p, position)}>{position === 'unknown' ? 'Skip' : position[0].toUpperCase()+position.slice(1)}</Button>)}</div></div>)}</div>
      <div className="card mt-4 space-y-4"><h2 className="font-semibold">How you like to write</h2><div><label htmlFor="tone">Tone</label><select id="tone" className="mt-2" value={profile.style.tone} onChange={e => setProfile(p => ({ ...p, style: { ...p.style, tone: e.target.value as Profile['style']['tone'] } }))}><option value="conversational">Conversational</option><option value="friendly">Friendly</option><option value="detailed">Detailed</option></select></div><div><label htmlFor="length">Length</label><select id="length" className="mt-2" value={profile.style.length} onChange={e => setProfile(p => ({ ...p, style: { ...p.style, length: e.target.value as Profile['style']['length'] } }))}><option value="short">Short</option><option value="medium">Medium</option><option value="long">Long</option></select></div><div><label htmlFor="formality">Formality</label><select id="formality" className="mt-2" value={profile.style.formality} onChange={e => setProfile(p => ({ ...p, style: { ...p.style, formality: e.target.value as Profile['style']['formality'] } }))}><option value="informal">Informal</option><option value="neutral">Neutral</option><option value="formal">Formal</option></select></div><label className="flex gap-3 items-center"><input className="!w-4" type="checkbox" checked={profile.style.usesEmojis} onChange={e => setProfile(p => ({ ...p, style: { ...p.style, usesEmojis: e.target.checked } }))}/>I like using emojis</label></div>
      <div className="flex justify-between mt-6">{onboarding && <Button variant="ghost" onClick={() => setStep(1)}><ChevronLeft size={16}/>Back</Button>}<Button disabled={saving || !loaded} onClick={() => void save()}>{saving ? 'Saving…' : onboarding ? 'Save and continue' : 'Save preferences'}<ArrowRight size={16}/></Button></div>
    </section>}
    {step === 3 && onboarding && <section><h1 className="text-4xl font-semibold mt-4">You’re ready.</h1><p className="mt-5 text-stone-500 leading-8">Browse Facebook normally. When you find a conversation you’d like to join, open My View from your browser toolbar.</p><div className="card mt-6"><p className="font-semibold">Try your first conversation</p><ol className="list-decimal ml-5 mt-4 space-y-3 text-sm text-stone-600"><li>Highlight a post’s text on Facebook.</li><li>Right-click and select “Use in My View”.</li><li>Write or edit a reply, then insert or copy it.</li><li>Review it on Facebook and click Comment yourself.</li></ol></div><Button asChild className="mt-7"><a href="https://www.facebook.com/" target="_blank" rel="noreferrer">Open Facebook<ArrowRight size={16}/></a></Button></section>}
    {error && <p role="alert" className="bg-amber-50 p-4 rounded-xl mt-6 text-sm text-amber-900">{error}</p>}{message && <p role="status" className="mt-6 text-teal-800">{message}</p>}
  </main>;
}
