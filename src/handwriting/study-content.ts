export interface AnchoredGloss {
  id: string; start: number; end: number; quote: string; meaning: string;
}
export interface StudySentence {
  id: string; text: string; meaning?: string; glosses?: AnchoredGloss[];
  /** The one key expression offered as a Reconstruction hint. */
  hint?: string;
  footnotes?: { id: string; text: string }[];
}
export interface StudyContent {
  id: string; title: string; date: string | null;
  classification: { id: string; label: string } | null;
  sentences: StudySentence[];
  vocabulary: { id: string; english: string; meaning: string; checked: boolean }[];
  grammar?: { id: string; english: string; label: string };
  personal: string;
  /** Speaking prompts: Muse's questions for the page (the sample has its own). */
  questions?: { id: string; en: string; native: string }[];
}
// Explicitly synthetic Work handoff fixture, never inserted into stored lessons.
// Span offsets are Unicode code-point indices, end exclusive.
export const studySample: StudyContent = {
  id: 'demo-studygram-2026-10-27', title: 'Making time for small things', date: '27 OCT 2026',
  classification: { id: 'demo-small-habits', label: 'Daily Life / Small Habits' },
  sentences: [
    { id:'example-story-01', hint:'slow down', text:'Today, I decided to slow down.', meaning:'今日は、少しペースを落とすことにした。', footnotes:[{id:'note-slow',text:'slow down = take things slowly'}] },
    { id:'example-story-02', hint:'make time for', text:'I made time for a quiet morning.', meaning:'静かな朝を過ごす時間をつくった。', glosses:[{id:'gloss-time',start:2,end:15,quote:'made time for',meaning:'〜のために時間をつくった'}] },
    { id:'example-story-03', hint:'instead of + -ing', text:'Instead of checking my phone, I opened my notebook.', meaning:'スマートフォンを見る代わりに、ノートを開いた。', footnotes:[{id:'note-instead',text:'rather than checking my phone'}] },
    { id:'example-story-04', hint:'settle in', text:'A warm cup of tea helped me settle in.', meaning:'温かいお茶を一杯飲むと、落ち着くことができた。', glosses:[{id:'gloss-settle',start:28,end:37,quote:'settle in',meaning:'落ち着く'}] },
    { id:'example-story-05', hint:'write down', text:'I wrote down one thing I wanted to remember.', meaning:'覚えておきたいことを一つ書き留めた。' },
    { id:'example-story-06', hint:'not have to be', text:'It did not have to be anything special.', meaning:'何か特別なことでなくてもよかった。', footnotes:[{id:'note-simple',text:'It could be something simple.'}] },
    { id:'example-story-07', hint:'make ... feel ...', text:'Small moments can make an ordinary day feel different.', meaning:'小さなひとときが、いつもの一日を違ったものにしてくれる。' },
    { id:'example-story-08', hint:'want to ... again', text:'Tomorrow, I want to make time for them again.', meaning:'明日も、そんな時間をつくりたい。' },
  ],
  vocabulary: [
    {id:'word-time',english:'make time for + noun',meaning:'〜のために時間をつくる',checked:false},
    {id:'word-instead',english:'instead of + -ing',meaning:'〜する代わりに',checked:false},
    {id:'word-settle',english:'settle in',meaning:'落ち着く',checked:false},
    {id:'word-write',english:'write down',meaning:'書き留める',checked:false},
  ],
  grammar: {id:'pattern-instead',english:'Instead of checking my phone, I opened my notebook.',label:'Instead of + -ing     /     I + past tense'},
  personal: '',
  questions: [
    { id:'question-1', en:'What do you like to do on a quiet morning?', native:'静かな朝には、何をするのが好きですか？' },
    { id:'question-2', en:'What is one small thing you want to remember from today?', native:'今日のことで、覚えておきたい小さなことは何ですか？' },
    { id:'question-3', en:'When do you make time for yourself?', native:'自分のための時間は、いつつくりますか？' },
  ],
};
