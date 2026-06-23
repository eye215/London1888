import { useEffect, useState } from 'react';
import { ArrowLeft, Check, Heart } from 'lucide-react';
import { allActors } from '../data/show';
import { TEAM_ACTOR_NAME, getActorDisplayName, isTeamActor } from '../lib/actors';
import { isDatabaseConfigured, supabase } from '../lib/supabase';

export default function SupportMessagePage() {
  const [nickname, setNickname] = useState('');
  const [actors, setActors] = useState<string[]>([]);
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const canSubmit = nickname.trim().length > 0 && actors.length > 0 && message.trim().length > 0 && !submitting;

  useEffect(() => window.scrollTo({ top: 0, left: 0, behavior: 'auto' }), []);

  const toggleAllActors = () => {
    setActors(prev => isTeamActor(prev) ? [] : [TEAM_ACTOR_NAME]);
  };

  const toggleActor = (name: string) => {
    const base = isTeamActor(actors) ? [] : actors;
    const next = base.includes(name) ? base.filter(actor => actor !== name) : [...base, name];
    const allSelected = allActors.every(actor => next.includes(actor));
    setActors(allSelected ? [TEAM_ACTOR_NAME] : next);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('');

    if (!nickname.trim()) return setStatus('닉네임을 입력해주세요.');
    if (!actors.length) return setStatus('응원할 배우를 선택해주세요.');
    if (!message.trim()) return setStatus('응원 메시지를 입력해주세요.');
    if (!isDatabaseConfigured) return setStatus('데이터베이스 연결 정보를 확인해주세요.');

    setSubmitting(true);
    const { error } = await supabase.from('messages').insert({
      reservation_id: null,
      actor_name: getActorDisplayName(actors),
      message: message.trim(),
      booking_number: null,
      nickname: nickname.trim(),
      author_display: nickname.trim(),
      source: 'supporter',
    });
    setSubmitting(false);

    if (error) {
      console.error(error);
      setStatus('메시지를 저장하지 못했습니다. 잠시 후 다시 시도해주세요.');
      return;
    }

    localStorage.setItem('toastMessage', '응원메세지가 등록되었습니다.');
    window.location.hash = '#/';
  };

  return (
    <main className="utility-page support-page">
      <header className="booking-header">
        <button className="text-button" onClick={() => window.location.hash = '#/'}><ArrowLeft size={18} /> 돌아가기</button>
        <span>1888 · SUPPORT MESSAGE</span>
      </header>

      <section className="utility-hero">
        <p>ONLY HEART</p>
        <h1>관람이 어려워도<br />마음은 남길 수 있어요</h1>
      </section>

      <section className="utility-card">
        <form onSubmit={submit} noValidate>
          <label className="field">
            <span className="field-label">닉네임<i>*</i></span>
            <input required aria-required="true" value={nickname} onChange={e => setNickname(e.target.value)} placeholder="표시될 이름을 입력해주세요" />
          </label>

          <div className="field">
            <span className="field-label">응원할 배우<i>*</i></span>
            <div className="actor-grid supporter-actor-grid" aria-label="응원할 배우 선택">
              <button type="button" onClick={toggleAllActors} className={isTeamActor(actors) ? 'actor selected all-actor' : 'actor all-actor'}>
                <span>{isTeamActor(actors) && <Check size={14} />}</span>
                <b>전체선택</b>
                <small>팀 전체</small>
              </button>
              {allActors.map(name => (
                <button type="button" key={name} disabled={isTeamActor(actors)} onClick={() => toggleActor(name)} className={actors.includes(name) ? 'actor selected' : 'actor'}>
                  <span>{actors.includes(name) && <Check size={14} />}</span>
                  <b>{name}</b>
                  <small>배우</small>
                </button>
              ))}
            </div>
          </div>

          <label className="field">
            <span className="field-label">응원 메시지<i>*</i></span>
            <textarea required aria-required="true" rows={7} value={message} onChange={e => setMessage(e.target.value.slice(0, 300))} placeholder="배우에게 전하고 싶은 마음을 남겨주세요." />
            <div className="counter">{message.length} / 300</div>
          </label>
          {status && <p className="status-message">{status}</p>}
          <button type="submit" className="submit-button" disabled={!canSubmit}><Heart size={18} /> {submitting ? '저장 중' : '응원메세지 남기기'}</button>
        </form>
      </section>
    </main>
  );
}
