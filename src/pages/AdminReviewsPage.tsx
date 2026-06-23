import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Lock, RefreshCw } from 'lucide-react';
import { allActors, getScheduleLabel } from '../data/show';
import { TEAM_ACTOR_NAME } from '../lib/actors';
import { supabase } from '../lib/supabase';

const ADMIN_PASSWORD = 'Dkdlen33!';
const ADMIN_SESSION_KEY = 'london1888AdminAuthed';

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
  const [loggedIn, setLoggedIn] = useState(() => sessionStorage.getItem(ADMIN_SESSION_KEY) === 'true');
  const [reviews, setReviews] = useState<PrivateReview[]>([]);
  const [actor, setActor] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadReviews = useCallback(async () => {
    if (!loggedIn) return;
    setLoading(true);
    setError('');
    try {
      const { data, error: loadError } = await supabase.rpc('list_reviews_admin', { p_password: ADMIN_PASSWORD });
      if (loadError) throw loadError;
      setReviews((data || []) as PrivateReview[]);
    } catch (loadError) {
      console.error(loadError);
      setError(loadError instanceof Error ? `후기 데이터를 불러오지 못했습니다. ${loadError.message}` : '후기 데이터를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, [loggedIn]);

  useEffect(() => {
    void loadReviews();
  }, [loadReviews]);

  const filtered = useMemo(() => {
    if (!actor) return reviews;
    return reviews.filter(review => review.actor_name === TEAM_ACTOR_NAME || review.actor_name.split(',').map(name => name.trim()).includes(actor));
  }, [reviews, actor]);

  const login = (event: React.FormEvent) => {
    event.preventDefault();
    if (password !== ADMIN_PASSWORD) {
      alert('비밀번호가 일치하지 않습니다.');
      return;
    }
    sessionStorage.setItem(ADMIN_SESSION_KEY, 'true');
    setLoggedIn(true);
  };

  if (!loggedIn) return (
    <main className="admin-login">
      <form onSubmit={login}>
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
        <button type="button" className="admin-action-button" onClick={() => void loadReviews()} disabled={loading}><RefreshCw size={17} /> {loading ? '불러오는 중' : '새로고침'}</button>
      </div>

      <section className="review-filter-chips admin-review-filter">
        <button type="button" className={!actor ? 'active' : ''} onClick={() => setActor('')}>전체</button>
        {allActors.map(name => <button type="button" key={name} className={actor === name ? 'active' : ''} onClick={() => setActor(name)}>{name}</button>)}
      </section>

      <section className="private-review-list">
        {loading && <div className="admin-empty">후기를 불러오는 중입니다.</div>}
        {error && <div className="admin-empty warning">{error}</div>}
        {!loading && !error && filtered.length === 0 && <div className="admin-empty"><span>NO REVIEWS YET</span><h3>아직 등록된 공연 후기가 없습니다.</h3></div>}
        {filtered.map(review => (
          <article className="private-review-card" key={review.id}>
            <header>
              <strong>TO. {review.actor_name}</strong>
              <small>{getScheduleLabel(review.schedule)}</small>
            </header>
            <p>{review.review_content}</p>
            <footer>
              <span>from, {review.author_display}</span>
              <time>{new Date(review.created_at).toLocaleString('ko-KR')}</time>
            </footer>
          </article>
        ))}
      </section>
    </main>
  );
}
