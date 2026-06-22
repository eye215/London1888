import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Check, Send } from 'lucide-react';
import { cast, schedules } from '../data/show';
import { supabase } from '../lib/supabase';

type ReviewAccess = {
  reservationId: string | null;
  name: string;
  phone: string;
  schedule: string;
  scheduleLabel: string;
  isTester: boolean;
};

export default function ReviewPage() {
  const [access, setAccess] = useState<ReviewAccess | null>(null);
  const [actorName, setActorName] = useState('');
  const [content, setContent] = useState('');
  const [status, setStatus] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const raw = sessionStorage.getItem('reviewAccess');
    if (!raw) {
      window.location.hash = '#/review-check';
      return;
    }
    try { setAccess(JSON.parse(raw) as ReviewAccess); }
    catch { window.location.hash = '#/review-check'; }
  }, []);

  const actors = useMemo(() => {
    if (!access) return [];
    const schedule = schedules.find(item => item.value === access.schedule);
    if (!schedule) return [];
    return Array.from(new Set([...cast[schedule.cast].main, ...cast[schedule.cast].ensemble]));
  }, [access]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!access) return;
    if (!actorName) return setStatus('후기를 전할 배우를 선택해주세요.');
    if (!content.trim()) return setStatus('공연 후기를 입력해주세요.');

    setSubmitting(true);
    setStatus('');
    const { error } = await supabase.rpc('submit_verified_review', {
      p_name: access.name,
      p_phone: access.phone,
      p_actor_name: actorName,
      p_review_content: content.trim(),
    });
    setSubmitting(false);

    if (error) {
      console.error(error);
      setStatus('후기를 저장하지 못했습니다. 예매 정보와 공연 시간을 확인해주세요.');
      return;
    }

    sessionStorage.removeItem('reviewAccess');
    localStorage.setItem('toastMessage', '공연 후기가 등록되었습니다.');
    window.location.hash = '#/';
  };

  if (!access) return null;

  return (
    <main className="utility-page review-page">
      <header className="booking-header">
        <button className="text-button" onClick={() => window.location.hash = '#/review-check'}><ArrowLeft size={18} /> 돌아가기</button>
        <span>1888 · PRIVATE REVIEW</span>
      </header>
      <section className="utility-hero review-hero">
        <p>CURTAIN CALL</p>
        <h1>공연의 여운을<br />배우에게 전해주세요.</h1>
        <span>{access.scheduleLabel}</span>
      </section>
      <section className="utility-card review-card">
        <form onSubmit={submit}>
          <div className="field">
            <span className="field-label">후기를 전할 배우</span>
            <div className="actor-grid supporter-actor-grid">
              {actors.map(name => (
                <button type="button" key={name} onClick={() => setActorName(name)} className={actorName === name ? 'actor selected' : 'actor'}>
                  <span>{actorName === name && <Check size={14} />}</span><b>{name}</b><small>배우</small>
                </button>
              ))}
            </div>
          </div>
          <label className="field">
            <span className="field-label">공연 후기</span>
            <textarea rows={9} value={content} onChange={e => setContent(e.target.value.slice(0, 1000))} placeholder="기억에 남은 장면과 배우에게 전하고 싶은 이야기를 남겨주세요." />
            <div className="counter">{content.length} / 1000</div>
          </label>
          {status && <p className="status-message">{status}</p>}
          <button className="submit-button" disabled={submitting}><Send size={18} /> {submitting ? '후기 저장 중' : '공연 후기 남기기'}</button>
        </form>
      </section>
    </main>
  );
}
