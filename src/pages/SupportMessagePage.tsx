import { useState } from 'react';
import { ArrowLeft, Check, Heart } from 'lucide-react';
import { allActors } from '../data/show';
import { TEAM_ACTOR_NAME } from '../lib/actors';
import { isDatabaseConfigured, supabase } from '../lib/supabase';

export default function SupportMessagePage() {
  const [nickname, setNickname] = useState('');
  const [actorName, setActorName] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('');

    if (!nickname.trim()) return setStatus('닉네임을 입력해주세요.');
    if (!actorName) return setStatus('응원할 배우를 선택해주세요.');
    if (!message.trim()) return setStatus('응원 메시지를 입력해주세요.');
    if (!isDatabaseConfigured) return setStatus('데이터베이스 연결 정보를 확인해주세요.');

    setSubmitting(true);
    const { error } = await supabase.from('messages').insert({
      reservation_id: null,
      actor_name: actorName,
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
        <form onSubmit={submit}>
          <label className="field">
            <span className="field-label">닉네임</span>
            <input value={nickname} onChange={e => setNickname(e.target.value)} placeholder="표시할 이름을 입력해주세요" />
          </label>

          <div className="field">
            <span className="field-label">응원할 배우</span>
            <div className="actor-grid supporter-actor-grid">
              <button type="button" onClick={() => setActorName(actorName === TEAM_ACTOR_NAME ? '' : TEAM_ACTOR_NAME)} className={actorName === TEAM_ACTOR_NAME ? 'actor selected all-actor' : 'actor all-actor'}>
                <span>{actorName === TEAM_ACTOR_NAME && <Check size={14} />}</span>
                <b>전체선택</b>
                <small>팀 전체</small>
              </button>
              {allActors.map(name => (
                <button type="button" key={name} disabled={actorName === TEAM_ACTOR_NAME} onClick={() => setActorName(actorName === name ? '' : name)} className={actorName === name ? 'actor selected' : 'actor'}>
                  <span>{actorName === name && <Check size={14} />}</span>
                  <b>{name}</b>
                  <small>배우</small>
                </button>
              ))}
            </div>
          </div>

          <label className="field">
            <span className="field-label">응원 메시지</span>
            <textarea rows={7} value={message} onChange={e => setMessage(e.target.value.slice(0, 300))} placeholder="배우에게 전하고 싶은 마음을 남겨주세요." />
            <div className="counter">{message.length} / 300</div>
          </label>
          {status && <p className="status-message">{status}</p>}
          <button type="submit" className="submit-button" disabled={submitting}><Heart size={18} /> {submitting ? '저장 중' : '응원메세지 남기기'}</button>
        </form>
      </section>
    </main>
  );
}
