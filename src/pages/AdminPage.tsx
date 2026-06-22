import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Download, Lock, MessageSquareText, Search } from 'lucide-react';
import { cast, getScheduleLabel, schedules } from '../data/show';
import { isDatabaseConfigured, supabase } from '../lib/supabase';

type Reservation = {
  id: string;
  name: string;
  phone: string;
  num_people: number;
  schedule: string;
  actor_name: string;
  created_at: string;
};

const ADMIN_PASSWORD = 'Dkdlen28!';

export default function AdminPage() {
  const [password, setPassword] = useState('');
  const [loggedIn, setLoggedIn] = useState(false);
  const [items, setItems] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [keyword, setKeyword] = useState('');

  const loadReservations = () => {
    if (!loggedIn || !isDatabaseConfigured) return;
    setLoading(true);
    setLoadError('');
    void supabase
      .rpc('list_reservations_admin', { p_password: ADMIN_PASSWORD })
      .then(({ data, error }) => {
        if (error) {
          console.error(error);
          setLoadError('예매 데이터를 불러오지 못했습니다. Supabase 관리자 조회 함수를 확인해주세요.');
        } else {
          setItems((data || []) as Reservation[]);
        }
        setLoading(false);
      });
  };

  useEffect(loadReservations, [loggedIn]);

  const filtered = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    if (!q) return items;
    return items.filter(item => [item.name, item.phone, item.actor_name, getScheduleLabel(item.schedule)].join(' ').toLowerCase().includes(q));
  }, [items, keyword]);

  const totalPeople = items.reduce((sum, item) => sum + item.num_people, 0);
  const scheduleStats = schedules.map(schedule => {
    const reservations = items.filter(item => item.schedule === schedule.value);
    return {
      schedule,
      count: reservations.length,
      people: reservations.reduce((sum, item) => sum + item.num_people, 0),
    };
  });

  if (!loggedIn) {
    return (
      <main className="admin-login">
        <form onSubmit={e => { e.preventDefault(); if (password === ADMIN_PASSWORD) setLoggedIn(true); else alert('비밀번호가 일치하지 않습니다.'); }}>
          <Lock />
          <p>1888 · ADMIN</p>
          <h1>관리자 로그인</h1>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="비밀번호" />
          <button className="primary">로그인</button>
          <button type="button" className="text-button" onClick={() => window.location.hash = '#/'}>홈으로 돌아가기</button>
        </form>
      </main>
    );
  }

  const download = () => {
    const rows = [
      ['예매번호', '이름', '전화번호', '인원', '스케줄', '배우', '예매일'],
      ...items.map(x => [x.id.slice(0, 8), x.name, x.phone, String(x.num_people), getScheduleLabel(x.schedule), x.actor_name, new Date(x.created_at).toLocaleString('ko-KR')]),
    ];
    const csv = '\uFEFF' + rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = '1888_예매내역.csv';
    a.click();
  };

  return (
    <main className="admin-page">
      <div className="admin-head">
        <button className="text-button" onClick={() => window.location.hash = '#/'}><ArrowLeft /> 홈</button>
        <div>
          <p>1888 BACK OFFICE</p>
          <h1>예매 관리</h1>
        </div>
        <div className="admin-head-actions">
          <button className="admin-review-link" onClick={() => window.location.hash = '#/admin/reviews'}><MessageSquareText size={17} /> 공연 후기</button>
          <button className="primary" onClick={download} disabled={!items.length}><Download /> CSV 다운로드</button>
        </div>
      </div>

      <section className="admin-dashboard admin-dashboard-row">
        <article><span>총 예매</span><strong>{items.length}</strong><small>건</small></article>
        <article><span>총 관람 인원</span><strong>{totalPeople}</strong><small>명</small></article>
        <article><span>최근 예매</span><strong>{items[0] ? new Date(items[0].created_at).toLocaleDateString('ko-KR') : '-'}</strong><small>updated</small></article>
      </section>

      <section className="admin-schedule-cards">
        {scheduleStats.map(({ schedule, count, people }) => (
          <article key={schedule.value}>
            <div>
              <span>{schedule.date}</span>
              <strong>{schedule.time}</strong>
              <small>CAST {schedule.cast}</small>
            </div>
            <p>{count}건 · {people}명</p>
            <em>배역 · {cast[schedule.cast].main.join(' · ')}</em>
          </article>
        ))}
      </section>

      <section className="admin-list-panel">
        <div className="admin-tools">
          <div>
            <h2>Reservation List</h2>
            <p>실시간 예매 데이터와 연결된 목록입니다. 이름, 전화번호, 배우명, 회차로 검색할 수 있습니다.</p>
          </div>
          <label className="admin-search"><Search size={16} /><input value={keyword} onChange={e => setKeyword(e.target.value)} placeholder="검색어 입력" /></label>
        </div>

        {loading && <div className="admin-empty">예매 내역을 불러오는 중입니다.</div>}
        {loadError && <div className="admin-empty warning">{loadError}</div>}
        {!loading && !loadError && filtered.length === 0 && (
          <div className="admin-empty">
            <span>NO RESERVATIONS YET</span>
            <h3>아직 표시할 예매 내역이 없습니다.</h3>
            <p>예매가 들어오면 이곳에 카드 형태로 정리되어 표시됩니다.</p>
          </div>
        )}

        <div className="admin-table">
          {filtered.map(x => (
            <article key={x.id}>
              <span>#{x.id.slice(0, 8).toUpperCase()}</span>
              <h2>{x.name} · {x.num_people}명</h2>
              <p>{x.phone}</p>
              <p>{getScheduleLabel(x.schedule)}</p>
              <strong>{x.actor_name}</strong>
              <time>{new Date(x.created_at).toLocaleString('ko-KR')}</time>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
