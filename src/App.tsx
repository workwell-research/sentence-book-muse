import { useId, useState } from 'react';
import { InterestSetup } from './InterestSetup';
import { readInterests } from './lib/interests';
import type { InterestRead } from './lib/interests';
import { EMPTY_NOTE, readNote, saveNote } from './lib/composer';
import type { ComposerNote, Level, NoteRead } from './lib/composer';

function restore(): NoteRead {
  try { return readNote(window.localStorage); } catch { return { kind: 'unreadable' }; }
}

function restoreInterests(): InterestRead {
  try { return readInterests(window.localStorage); } catch { return { kind: 'unreadable' }; }
}

export function App() {
  const [profile, setProfile] = useState<InterestRead>(restoreInterests);
  const [choosingInterests, setChoosingInterests] = useState(profile.kind !== 'ready');
  function finishInterests() {
    setChoosingInterests(false);
    requestAnimationFrame(() => document.getElementById('compose-title')?.focus());
  }
  const [initial] = useState(restore);
  const [note, setNote] = useState<ComposerNote>(initial.kind === 'ready' ? initial.note : EMPTY_NOTE);
  const [message, setMessage] = useState('');
  const [failed, setFailed] = useState(false);
  const [dirty, setDirty] = useState(false);
  const topicId = useId();
  const blocked = initial.kind === 'unreadable';

  function update(patch: Partial<ComposerNote>) {
    setNote(current => ({ ...current, ...patch }));
    setDirty(true);
    setMessage('');
    setFailed(false);
  }

  function save(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      saveNote(window.localStorage, note);
      setMessage('このブラウザにメモを保存しました。');
      setDirty(false);
      setFailed(false);
    } catch {
      setMessage('メモを保存できませんでした。入力はこの画面に残っています。文章をコピーして控えてください。');
      setFailed(true);
    }
  }

  return <>
    <a className="skip-link" href={choosingInterests ? "#interests" : "#compose"}>{choosingInterests ? "関心を選ぶ" : "メモを書く"}</a>
    <header className="masthead">
      <a className="wordmark" href={choosingInterests ? "#interests" : "#shelf"}>The Sentence Book<span>自分の言葉を、自分の本に。</span></a>
      <a className="header-link" href={choosingInterests ? "#interests" : "#compose"}>{choosingInterests ? "関心を選ぶ" : "メモを書く"} <span aria-hidden="true">→</span></a>
    </header>
    <main>
      {choosingInterests ? <InterestSetup initial={profile} onDismiss={finishInterests}
        onSaved={saved => { setProfile({ kind: 'ready', profile: saved }); finishInterests(); }} /> : <>
      <section className="intro" aria-labelledby="intro-title">
        <h1 id="intro-title">話したいことから、<br />一ページずつ。</h1>
        <p>旅のこと、日々のこと、大切なこと。<br />自分の言葉で練習するための、小さな本棚です。</p>
      </section>
      <div className="workspace">
        <section className="library" id="shelf" aria-labelledby="shelf-title">
          <div className="section-heading"><h2 id="shelf-title">あなたの本棚</h2><span>0 冊</span></div>
          <div className="empty-shelf">
            <span className="empty-shelf-rule" aria-hidden="true" />
            <h3>はじまりは、まだ白紙。</h3>
            <p>テーマは、これから。<br />話したいことに合わせて育てていく本棚です。</p>
          </div>
          <div className="shelf-edge" aria-hidden="true" />
          <p className="shelf-caption">教材づくりが始まったら、仕舞う先を提案します。<br />新しい本を増やすときは、あなたが確認してから。</p>
          <div className="inbox-line"><span>仕分けを待つページ</span><span>0 ページ</span></div>
        </section>
        <section className="writing-paper" id="compose" aria-labelledby="compose-title">
          <h2 id="compose-title" tabIndex={-1}>今日は、何を話したい？</h2>
          <p className="paper-intro">今日のひとことや、SNSに書いた短いメモでも。</p>
          <div className="interest-summary">
            <div><span>いまの関心</span><p>{profile.kind === 'ready' && profile.profile.interests.length
              ? profile.profile.interests.join('、') : profile.kind === 'unreadable' ? '保存した関心を読み込めません' : 'まだ選んでいません'}</p></div>
            <button className="text-button" type="button" onClick={() => setChoosingInterests(true)}>関心を変更</button>
          </div>
          <form onSubmit={save}>
            <label htmlFor={topicId}>話したいこと</label>
            <textarea id={topicId} value={note.topic} maxLength={2000} rows={5}
              placeholder="たとえば、今日は電車が遅れて、コーヒーを買う時間がなかった。"
              onChange={event => update({ topic: event.target.value })}
              aria-describedby={`${topicId}-hint`} />
            <div className="field-hint" id={`${topicId}-hint`}><span>ひとことでも、空欄でも大丈夫。</span><span>{note.topic.length} / 2,000</span></div>
            <div className="preferences">
              <label>説明に使う言語<select value={note.nativeLanguage} onChange={event => update({ nativeLanguage: event.target.value })}>
                <option value="ja">日本語</option><option value="en">English</option><option value="es">Español</option>
                <option value="fr">Français</option><option value="ko">한국어</option><option value="zh">中文</option>
              </select></label>
              <label>練習する英語<select value={note.level} onChange={event => update({ level: event.target.value as Level })}>
                <option value="A2">A2 · 短い文から</option><option value="B1">B1 · 理由も伝える</option><option value="B2">B2 · 詳しく伝える</option>
              </select></label>
            </div>
            {blocked && <p className="error" role="alert">保存したメモを読み込めませんでした。元のデータを守るため、保存を停止しています。入力する場合は、文章をコピーして控えてください。</p>}
            <div className="form-actions"><button className="save-button" type="submit" disabled={blocked || !dirty}>メモを保存</button><span>このブラウザだけに保存</span></div>
            <p className={failed ? 'save-status error' : 'save-status'} role="status">{message || (dirty ? 'まだ保存されていない変更があります。' : '')}</p>
            <div className="generation-note"><button type="button" disabled>教材を作る · 準備中</button><p>教材づくりは、ただいま準備中です。<br />関心領域と、話したいことをメモしておけます。</p></div>
          </form>
        </section>
      </div>
      </>}
    </main>
    <footer><span>The Sentence Book <i>with Muse</i></span><span>あなたのペースで、一文ずつ。</span></footer>
  </>;
}
