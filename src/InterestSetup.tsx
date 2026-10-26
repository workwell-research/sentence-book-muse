import { useEffect, useId, useRef, useState } from 'react';
import { INTEREST_SUGGESTIONS, MAX_INTERESTS, interestSchema } from '../shared/interests';
import type { InterestProfile } from '../shared/interests';
import { saveInterests } from './lib/interests';
import type { InterestRead } from './lib/interests';

interface Props {
  initial: InterestRead;
  onSaved: (profile: InterestProfile) => void;
  onDismiss: () => void;
}

export function InterestSetup({ initial, onSaved, onDismiss }: Props) {
  const [selected, setSelected] = useState<string[]>(initial.kind === 'ready' ? initial.profile.interests : []);
  const [custom, setCustom] = useState('');
  const [message, setMessage] = useState('');
  const title = useRef<HTMLHeadingElement>(null);
  const customId = useId();
  const blocked = initial.kind === 'unreadable';
  const options = [...INTEREST_SUGGESTIONS, ...selected.filter(value => !(INTEREST_SUGGESTIONS as readonly string[]).includes(value))];
  useEffect(() => { title.current?.focus(); }, []);

  function toggle(value: string) {
    setMessage('');
    if (selected.includes(value)) setSelected(current => current.filter(item => item !== value));
    else if (selected.length < MAX_INTERESTS) setSelected(current => [...current, value]);
    else setMessage('関心領域は12個まで保存できます。入れ替える場合は、ひとつ外してください。');
  }

  function withCustom(): string[] | null {
    if (!custom.trim()) return selected;
    const parsed = interestSchema.safeParse(custom);
    if (!parsed.success) { setMessage('追加する関心は40文字以内で書いてください。'); return null; }
    const name = parsed.data;
    const normalized = name.normalize('NFKC').toLocaleLowerCase('en-US');
    if (selected.some(value => value.normalize('NFKC').toLocaleLowerCase('en-US') === normalized)) {
      setCustom('');
      return selected;
    }
    if (selected.length >= MAX_INTERESTS) {
      setMessage('関心領域は12個まで保存できます。入れ替える場合は、ひとつ外してください。');
      return null;
    }
    return [...selected, name];
  }

  function addCustom() {
    const next = withCustom();
    if (next) { setSelected(next); setCustom(''); setMessage(''); }
  }

  function persist(values: string[]) {
    try {
      const profile = saveInterests(window.localStorage, values);
      onSaved(profile);
    } catch {
      setMessage('関心領域を保存できませんでした。選択はこの画面に残っています。保存し直すか、メモへ進んでください。');
    }
  }

  function submit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const next = withCustom();
    if (next && next.length > 0) persist(next);
  }

  return <section className="interest-setup" id="interests" aria-labelledby="interests-title">
    <div className="interest-intro">
      <h1 id="interests-title" ref={title} tabIndex={-1}>何に、<br />心が動きますか。</h1>
      <p>好きなこと、気になること。<br />英語で話せたらうれしい領域を選んでください。</p>
      <p>Museが、選んだ関心を手がかりに<br />日々のひとことから練習の題材を考えます。</p>
      <p className="setup-availability">教材づくりは準備中です。<br />今は関心領域とメモを保存できます。</p>
    </div>
    <form className="writing-paper interest-paper" onSubmit={submit}>
      <fieldset>
        <legend>興味のあること</legend>
        <p className="interest-hint">複数選べます。あとから変えても大丈夫。</p>
        <div className="interest-options">
          {options.map(value => <label className="interest-choice" key={value}>
            <input type="checkbox" checked={selected.includes(value)} onChange={() => toggle(value)} disabled={blocked} />
            <span>{value}</span>
          </label>)}
        </div>
      </fieldset>
      <label htmlFor={customId}>自分の言葉で追加</label>
      <div className="custom-interest">
        <input id={customId} type="text" value={custom} maxLength={40} placeholder="たとえば、宇宙や星のこと" disabled={blocked}
          onChange={event => { setCustom(event.target.value); setMessage(''); }}
          onKeyDown={event => { if (event.key === 'Enter' && !event.nativeEvent.isComposing) { event.preventDefault(); addCustom(); } }} />
        <button className="text-button" type="button" onClick={addCustom} disabled={blocked || !custom.trim()}>追加</button>
      </div>
      {blocked && <p className="error" role="alert">保存した関心領域を読み込めませんでした。元のデータを守るため、上書きせずにメモへ進めます。</p>}
      <p className="save-status error" role="status">{message}</p>
      <div className="interest-actions">
        <button className="save-button" type="submit" disabled={blocked || (!selected.length && !custom.trim())}>関心を保存して進む</button>
        {initial.kind === 'missing' && !selected.length && !custom.trim()
          ? <button className="text-button" type="button" onClick={() => persist([])}>あとで選ぶ</button>
          : <button className="text-button" type="button" onClick={onDismiss}>保存せずメモへ</button>}
      </div>
      {initial.kind === 'ready' && <button className="text-button clear-interests" type="button" disabled={blocked}
        onClick={() => persist([])}>関心の指定を外す</button>}
      <p className="interest-footnote">選んだ関心はこのブラウザに保存されます。<br />本棚の本は、教材を確認してから作ります。</p>
    </form>
  </section>;
}
