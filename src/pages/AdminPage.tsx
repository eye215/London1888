import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Download, Lock, MessageSquareText, RefreshCw } from 'lucide-react';
import { cast, getCompactScheduleLabel, schedules } from '../data/show';
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

const ADMIN_PASSWORD = 'Dkdlen33!';
const ADMIN_SESSION_KEY = 'london1888AdminAuthed';
const SEATS_PER_SHOW = 589;

export default function AdminPage() {
  const [password, setPassword] = useState('');
  const [loggedIn, setLoggedIn] = useState(false);
  const [items, setItems] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [activeSchedule, setActiveSchedule] = useState('all');

  const loadReservations = useCallback(async () => {
    if (!loggedIn) return;
    if (!isDatabaseConfigured) {
      setLoadError('Supabase 연결 정보가 없습니다. 배포 환경변수를 확인해주세요.');
      return;
    }

    setLoading(true);
    setLoadError('');
    try {
      const { data, error } = await supabase.rpc('list_reservations_admin', { p_password: ADMIN_PASSWORD });
      if (error) throw error;
      setItems((data || []) as Reservation[]);
    } catch (error) {
      console.error(error);
      setLoadError(error instanceof Error ? `예매 데이터를 불러오지 못했습니다. ${error.message}` : '예매 데이터를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, [loggedIn]);

  useEffect(() => {
    void loadReservations();
  }, [loadReservations]);

  const totalPeople = items.reduce((sum, item) => sum + item.num_people, 0);
  const latest = items[0] ? new Date(items[0].created_at).toLocaleDateString('ko-KR') : '-';
  const scheduleStats = schedules.map(schedule => {
    const reservations = items.filter(item => item.schedule === schedule.value);
    const people = reservations.reduce((sum, item) => sum + item.num_people, 0);
    return { schedule, count: reservations.length, people, remain: SEATS_PER_SHOW - people };
  });

  const filtered = useMemo(() => {
    if (activeSchedule === 'all') return items;
    return items.filter(item => item.schedule === activeSchedule);
  }, [items, activeSchedule]);

  const login = (event: React.FormEvent) => {
    event.preventDefault();
    if (password !== ADMIN_PASSWORD) {
      alert('비밀번호가 일치하지 않습니다.');
      return;
    }
    sessionStorage.setItem(ADMIN_SESSION_KEY, 'true');
    setLoggedIn(true);
  };

  if (!loggedIn) {
    return (
      <main className="admin-login">
        <form onSubmit={login}>
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
      ['이름', '전화번호', '인원', '스케줄', '배우', '예매일'],
      ...items.map(x => [x.name, x.phone, String(x.num_people), getCompactScheduleLabel(x.schedule), x.actor_name, new Date(x.created_at).toLocaleString('ko-KR')]),
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
          <button type="button" className="admin-action-button" onClick={() => window.location.hash = '#/admin/reviews'}><MessageSquareText size={17} /> 공연후기</button>
          <button type="button" className="admin-action-button" onClick={download} disabled={!items.length}><Download size={17} /> CSV</button>
          <button type="button" className="admin-action-button" onClick={() => void loadReservations()} disabled={loading}><RefreshCw size={17} /> {loading ? '불러오는 중' : '새로고침'}</button>
        </div>
      </div>

      <section className="admin-list-panel reservation-admin-panel">
        <section className="admin-summary-card in-panel-summary">
          <div><span>총 예매</span><strong>{items.length}</strong><small>건</small></div>
          <div><span>총 관람 인원</span><strong>{totalPeople}</strong><small>명</small></div>
          <div className="latest-summary"><span>최근 예매</span><strong>{latest}</strong><small>updated</small></div>
        </section>

        <div className="admin-tools">
          <div>
            <h2>Reservation List</h2>
            <p>예매 현황과 예매 리스트를 한 화면에서 확인합니다.</p>
          </div>
        </div>

        <div className="admin-schedule-cards in-panel">
          {scheduleStats.map(({ schedule, count, people, remain }) => {
            const visibleNames = cast[schedule.cast].main.filter(name => !['유리', '흥섭', '준범'].includes(name));
            return (
              <article key={schedule.value}>
                <header><strong>{schedule.date} {schedule.time}</strong></header>
                <div className="seat-line"><span>{count}건 · {people}명</span><b>{remain.toLocaleString()}석 남음</b></div>
                <em>{visibleNames.join(' · ')}</em>
              </article>
            );
          })}
        </div>

        <div className="reservation-tabs">
          <button type="button" className={activeSchedule === 'all' ? 'active' : ''} onClick={() => setActiveSchedule('all')}>전체</button>
          {schedules.map(schedule => (
            <button type="button" key={schedule.value} className={activeSchedule === schedule.value ? 'active' : ''} onClick={() => setActiveSchedule(schedule.value)}>
              {schedule.date} · {schedule.time}
            </button>
          ))}
        </div>

        {loading && <div className="admin-empty">예매 내역을 불러오는 중입니다.</div>}
        {loadError && <div className="admin-empty warning">{loadError}</div>}
        {!loading && !loadError && filtered.length === 0 && (
          <div className="admin-empty">
            <span>NO RESERVATIONS YET</span>
            <h3>아직 표시할 예매 내역이 없습니다.</h3>
            <p>예매가 들어오면 이 영역에 카드 형태로 정리됩니다.</p>
          </div>
        )}

        <div className="admin-table compact-reservation-list">
          {filtered.map(x => (
            <article key={x.id}>
              <header>
                <h2>{x.name}</h2>
                <strong>{x.num_people}명</strong>
              </header>
              <dl>
                <div><dt>전화번호</dt><dd>{x.phone}</dd></div>
                <div><dt>회차</dt><dd>{getCompactScheduleLabel(x.schedule)}</dd></div>
                <div><dt>배우</dt><dd>{x.actor_name}</dd></div>
                <div><dt>예매일</dt><dd>{new Date(x.created_at).toLocaleString('ko-KR')}</dd></div>
              </dl>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
