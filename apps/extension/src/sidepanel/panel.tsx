import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowDownToLine, Check, ChevronDown, Copy, ExternalLink, MessageSquare, MousePointer2, RefreshCw, ShieldCheck, Sparkles } from 'lucide-react';
import { Button, Logo, cn } from '@my-view/ui';
import type { InteractionInput, Suggestion, SuggestResult } from '@my-view/shared';
import type { Capture } from '../types';
type Props = { getToken: () => Promise<string | null>; account: string; onSignOut?: () => Promise<void> };
export function Panel({ getToken, account, onSignOut }: Props) {
  const [capture, setCapture] = useState<Capture | null>(null);
  const [reply, setReply] = useState('');
  const [result, setResult] = useState<SuggestResult | null>(null);
  const [chosen, setChosen] = useState<Suggestion | null>(null);
  const [instructions, setInstructions] = useState('');
  const [tone, setTone] = useState<'short' | 'friendly' | 'detailed'>('friendly');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [connected, setConnected] = useState(false);
  const [connection, setConnection] = useState('Checking connection…');
  const [telemetry, setTelemetry] = useState('');
  const [expanded, setExpanded] = useState(false);
  const captureRef = useRef<Capture | null>(null);
  const mounted = useRef(true);
  const api = useCallback(async (path: string, data?: unknown) => {
    const token = await getToken();
    if (!token) throw new Error('Sign-in is not configured yet. Local capture, editing and copy are available.');
    const response = await fetch(`${__API_URL__}/api/${path}`, { method: data ? 'POST' : 'GET', headers: { Authorization: `Bearer ${token}`, ...(data ? { 'Content-Type': 'application/json' } : {}) }, body: data ? JSON.stringify(data) : undefined, signal: AbortSignal.timeout(45000) });
    const value = await response.json();
    if (!response.ok) throw new Error(value.error || 'Could not connect to My View.');
    return value;
  }, [getToken]);
  const checkConnection = useCallback(async () => {
    setConnection('Checking connection…');
    try { await api('me'); setConnected(true); setConnection('Account & API connected'); }
    catch (e) { setConnected(false); setConnection(e instanceof Error ? e.message : 'Connection unavailable.'); }
  }, [api]);
  useEffect(() => { void checkConnection(); }, [checkConnection]);
  useEffect(() => {
    mounted.current = true;
    function load(data: { capture?: Capture; draft?: { captureId: string; text: string }; captureError?: string }) {
      if (data.capture && data.capture.id !== captureRef.current?.id) {
        captureRef.current = data.capture; setCapture(data.capture); setReply(data.draft?.captureId === data.capture.id ? data.draft.text : '');
        setResult(null); setChosen(null); setError(''); setNotice('Post captured. Write your reply or ask for a starting point.'); setTelemetry('');
      }
      if (data.captureError) setError(data.captureError);
    }
    void chrome.storage.session.get(['capture','draft','captureError']).then(load);
    const listener = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
      if (area === 'session' && (changes.capture || changes.captureError)) void chrome.storage.session.get(['capture','draft','captureError']).then(load);
    };
    chrome.storage.onChanged.addListener(listener);
    return () => { mounted.current = false; chrome.storage.onChanged.removeListener(listener); };
  }, []);
  function postData(current: Capture) { return { captureId: current.id, post: { text: current.post.postText, author: current.post.author, url: current.post.url, visibleComments: current.post.visibleComments || [] } }; }
  useEffect(() => {
    if (capture && connected) void api('capture', postData(capture)).catch(() => setTelemetry('Capture measurement could not be saved. Your reply is still available.'));
  }, [capture, connected, api]);
  useEffect(() => { if (connected) void api('interaction', { event: 'my_view_opened' }).catch(() => {}); }, [connected, api]);
  async function track(input: InteractionInput, current = capture) {
    if (!connected || !current) return;
    try { await api('capture', postData(current)); await api('interaction', { ...input, captureId: current.id }); }
    catch { setTelemetry('Reply handed off; measurement could not be saved.'); }
  }
  function edit(text: string) {
    setReply(text); setNotice('');
    if (capture) void chrome.storage.session.set({ draft: { captureId: capture.id, text } });
  }
  async function pick() {
    setError(''); setNotice('Click the post on Facebook. Highlighting text and using the right-click menu also works.');
    const response = await chrome.runtime.sendMessage({ type: 'MV_PICK' }).catch(() => ({ ok: false, error: 'Reopen the extension and try again.' }));
    if (!response.ok) { setError(response.error); setNotice(''); }
  }
  async function suggest() {
    if (!capture) return;
    const current = capture; setBusy(true); setError(''); setNotice('');
    try {
      const generated: SuggestResult = await api('suggest', { ...postData(current), instructions, tone, regenerate: Boolean(result) });
      if (captureRef.current?.id !== current.id || !mounted.current) return;
      setResult(generated); setChosen(null);
      setNotice('Choose a starting point below, then make it your own.');
    } catch (e) { setError(e instanceof Error ? e.message : 'Suggestions unavailable.'); }
    finally { setBusy(false); }
  }
  function select(suggestion: Suggestion) { setChosen(suggestion); edit(suggestion.text); void track({ event: 'suggestion_selected', suggestionId: suggestion.id }); }
  async function handoff(insert: boolean) {
    if (!reply.trim() || !capture) return;
    setError(''); setNotice('');
    const current = capture; const text = reply.trim(); const suggestion = chosen;
    let inserted = false;
    if (insert) {
      const response = await chrome.runtime.sendMessage({ type: 'MV_INSERT', captureId: current.id, text }).catch(() => ({ ok: false, error: 'Could not reach Facebook.' }));
      inserted = Boolean(response.ok);
      if (!inserted) setNotice(`${response.error || 'Insertion unavailable.'} Copying your reply instead.`);
    }
    if (!inserted) {
      try { await navigator.clipboard.writeText(text); }
      catch { setError('Clipboard access failed. Select the reply text and copy it manually.'); return; }
    }
    setNotice(inserted ? 'Inserted into Facebook. Review it there and click Comment yourself.' : insert ? 'Reply copied. Paste it into Facebook, review it and click Comment yourself.' : 'Reply copied. Paste it into Facebook when you’re ready.');
    if (suggestion && text !== suggestion.text) await track({ event: 'suggestion_edited', suggestionId: suggestion.id, finalText: text }, current);
    await track({ event: inserted ? 'suggestion_inserted' : 'suggestion_copied', suggestionId: suggestion?.id, finalText: text }, current);
  }
  return <div className="min-h-screen flex flex-col">
    <header className="px-5 py-5 border-b border-stone-200 flex items-center justify-between"><Logo /><span className="text-[10px] rounded-full bg-teal-50 text-teal-800 px-2.5 py-1 font-bold tracking-wider">EARLY ACCESS</span></header>
    <main className="p-5 space-y-5 flex-1">
      <div><p className="eyebrow">Your voice. A little less friction.</p><h1 className="mt-2 text-[25px] leading-tight font-semibold tracking-tight">Join the conversation.</h1><p className="mt-2 text-sm leading-6 text-stone-500">A starting point for what you want to say.</p></div>
      <section className="card !p-4"><div className="flex items-center justify-between"><span className="eyebrow">1 · The conversation</span><Button variant="ghost" size="sm" onClick={() => void pick()}><MousePointer2 size={14} />{capture ? 'Change post' : 'Choose post'}</Button></div>
        {capture ? <><p className="text-sm font-semibold mt-3">{capture.post.author || 'Selected Facebook post'}</p><p className={cn('text-sm leading-6 text-stone-600 mt-2 whitespace-pre-wrap break-words', !expanded && 'line-clamp-5')}>{capture.post.postText}</p><button className="mt-2 text-xs text-teal-800 flex gap-1 items-center" onClick={() => setExpanded(!expanded)}>{expanded ? 'Show less' : 'Show full text'}<ChevronDown size={12} /></button></> : <div className="py-7 text-center"><MessageSquare className="mx-auto text-stone-400" size={28} /><p className="text-sm text-stone-600 mt-3">Choose a post on Facebook.</p><p className="text-xs text-stone-500 mt-2 leading-5">Or highlight its text, right-click,<br/>and select “Use in My View”.</p></div>}
      </section>
      {capture && <>
        {result && <section className="rounded-xl bg-teal-50/70 p-4"><p className="eyebrow">What they’re discussing</p><p className="mt-2 text-sm leading-6">{result.summary}</p>{result.clarification && <p className="mt-3 text-sm font-semibold">{result.clarification}</p>}</section>}
        <section><label htmlFor="intention">What would you like to say? <span className="font-normal text-stone-400">Optional</span></label><input id="intention" className="mt-2 text-sm" maxLength={1000} value={instructions} onChange={e => setInstructions(e.target.value)} placeholder="e.g. I’d like to ask how this will work locally" />
          <div className="flex gap-2 mt-3">{(['short','friendly','detailed'] as const).map(t => <Button variant={tone === t ? 'default' : 'outline'} size="sm" key={t} onClick={() => setTone(t)} aria-pressed={tone === t} className="capitalize">{t}</Button>)}</div>
          <Button variant="outline" className="w-full mt-3" disabled={busy || !connected} onClick={() => void suggest()}>{busy ? <RefreshCw size={16} className="animate-spin" /> : <Sparkles size={16} />}{busy ? 'Finding a starting point…' : result ? 'Try another' : 'Suggest a starting point'}</Button>
        </section>
        {result && <section className="space-y-2">{result.suggestions.map(s => <button key={s.id} onClick={() => select(s)} className={cn('w-full text-left rounded-xl border p-3 transition-colors', chosen?.id === s.id ? 'bg-teal-50 border-teal-700' : 'bg-white border-stone-200 hover:border-teal-600')}><span className="text-xs font-semibold capitalize text-teal-800">{s.style === 'short' ? 'Concise' : s.style === 'question' ? 'Question-led' : 'Conversational'}</span><p className="text-sm leading-6 mt-1">{s.text}</p></button>)}</section>}
        <section><div className="flex justify-between mb-2"><label htmlFor="reply">2 · Your reply</label><span className="text-xs text-stone-400">Always editable</span></div><textarea id="reply" rows={7} value={reply} maxLength={5000} onChange={e => edit(e.target.value)} placeholder="Write your reply here, or edit a starting point above…" /><p className="text-right text-[11px] text-stone-400 mt-1">{reply.length} / 5,000</p>
          <Button className="w-full mt-3" disabled={!reply.trim()} onClick={() => void handoff(true)}><ArrowDownToLine size={17}/>Insert into Facebook</Button><Button className="w-full mt-2" variant="outline" disabled={!reply.trim()} onClick={() => void handoff(false)}><Copy size={15}/>Copy reply</Button>
        </section>
      </>}
      {notice && <p role="status" className="rounded-xl bg-teal-50 p-3 text-sm leading-6 text-teal-900 flex gap-2"><Check size={16} className="shrink-0 mt-1"/>{notice}</p>}
      {error && <p role="alert" className="rounded-xl bg-amber-50 p-3 text-sm leading-6 text-amber-900">{error}</p>}
      {telemetry && <p className="text-xs text-stone-500">{telemetry}</p>}
      <p className="flex gap-2 text-xs leading-5 text-stone-500"><ShieldCheck className="shrink-0 mt-0.5" size={15}/>You decide what to publish. Review your reply and click Facebook’s Comment button yourself.</p>
    </main>
    <footer className="p-5 border-t border-stone-200 bg-white text-xs text-stone-500 space-y-2"><p className="truncate">{account}</p><div className="flex items-start gap-2"><span className={cn('rounded-full w-1.5 h-1.5 shrink-0 mt-1.5', connected ? 'bg-teal-600' : 'bg-amber-500')}/><p className="leading-5">{connection}</p></div><div className="flex gap-4"><button className="text-teal-800" onClick={() => void checkConnection()}>Check connection</button><a className="text-teal-800 inline-flex gap-1" target="_blank" rel="noreferrer" href={`${__API_URL__}/profile`}>My preferences<ExternalLink size={12}/></a>{onSignOut && <button onClick={() => void onSignOut()}>Sign out</button>}</div></footer>
  </div>;
}
