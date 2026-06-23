import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Lock, Search } from 'lucide-react';
import { allActors, getScheduleLabel } from '../data/show';
import { supabase } from '../lib/supabase';

const ADMIN_PASSWORD = 'Dkdlen28!';

type PrivateReview = {
  id: string;
  actor_name: string;
  author_display: string;
  schedule: string;
  review_content: string;
  created_at: string;
};

export default function AdminReviewsPage() {
  const [password, setPassword] = useState('');
  const [loggedIn, setLoggedIn] = useState(false);
  const [reviews, setReviews] = useState<PrivateReview[]>([]);
  const [actor, setActor] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!loggedIn) return;
    setLoading(true);
    setError('');
    void supabase.rpc('list_reviews_admin', { p_password: ADMIN_PASSWORD }).then(({ data, error: loadError }) => {
      if (loadError) {
        console.error(loadError);
        setError(`후기 데이터를 불러오지 못했습니다. ${loadError.message}`);
      } else {
        setReviews((data || []) as PrivateReview[]);
      }
      setLoading(false);
    });
  }, [loggedIn]);

  const filtered = useMemo(() => actor ? reviews.filter(review => review.actor_name === actor) : reviews, [reviews, actor]);

  if (!loggedIn) return (
    <main className="admin-login">
      <form onSubmit={e => { e.preventDefault(); if (password === ADMIN_PASSWORD) setLoggedIn(true); else alert('비밀번호가 일치하지 않습니다.'); }}>
        <Lock /><p>1888 · CAST ONLY</p><h1>공연 후기 열람</h1>
        <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="비밀번호" />
        <button className="primary">확인</button>
        <button type="button" className="text-button" onClick={() => window.location.hash = '#/admin'}>예매 관리로 돌아가기</button>
      </form>
    </main>
  );

  return (
    <main className="admin-page admin-reviews-page">
      <div className="admin-head">
        <button className="text-button" onClick={() => window.location.hash = '#/admin'}><ArrowLeft /> 예매 관리</button>
        <div><p>1888 CAST ROOM</p><h1>공연 후기</h1></div>
        <label className="admin-search"><Search size={16} /><select value={actor} onChange={e => setActor(e.target.value)}><option value="">전체 배우</option>{allActors.map(name => <option key={name}>{name}</option>)}</select></label>
      </div>
      <section className="private-review-list">
        {loading && <div className="admin-empty">후기를 불러오는 중입니다.</div>}
        {error && <div className="admin-empty warning">{error}</div>}
        {!loading && !error && filtered.length === 0 && <div className="admin-empty"><span>NO REVIEWS YET</span><h3>아직 등록된 공연 후기가 없습니다.</h3></div>}
        {filtered.map(review => (
          <article className="private-review-card" key={review.id}>
            <header><strong>TO. {review.actor_name}</strong><time>{new Date(review.created_at).toLocaleString('ko-KR')}</time></header>
            <p>{review.review_content}</p>
            <footer><span>from, {review.author_display}</span><small>{getScheduleLabel(review.schedule)}</small></footer>
          </article>
        ))}
      </section>
    </main>
  );
}
