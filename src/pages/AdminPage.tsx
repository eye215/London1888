import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Download, Edit3, Lock, MessageSquareText, RefreshCw, Save, Trash2, X } from 'lucide-react';
import { cast, getCompactScheduleLabel, schedules } from '../data/show';
import { isDatabaseConfigured, supabase } from '../lib/supabase';
import { syncGoogleSheet } from '../lib/googleSheet';

type Reservation = {
  id: string;
  name: string;
  phone: string;
  num_people: number;
  schedule: string;
  actor_name: string;
  message?: string | null;
  created_at: string;
  admin_deleted_at?: string | null;
};

const ADMIN_PASSWORD = 'Dkdlen33!';
const ADMIN_SESSION_KEY = 'london1888AdminAuthed';
const SEATS_PER_SHOW = 589;

export default function AdminPage() {
  const [password, setPassword] = useState('');
  const [loggedIn, setLoggedIn] = useState(() => sessionStorage.getItem(ADMIN_SESSION_KEY) === 'true');
  const [items, setItems] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [loginError, setLoginError] = useState('');
  const [activeSchedule, setActiveSchedule] = useState('all');
  const [editingId, setEditingId] = useState('');
  const [editPeople, setEditPeople] = useState('1');
  const [editSchedule, setEditSchedule] = useState(schedules[0].value);
  const [actionMessage, setActionMessage] = useState('');

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

  const activeItems = useMemo(() => items.filter(item => !item.admin_deleted_at), [items]);
  const totalPeople = activeItems.reduce((sum, item) => sum + item.num_people, 0);
  const latest = activeItems[0] ? new Date(activeItems[0].created_at).toLocaleDateString('ko-KR') : '-';
  const scheduleStats = schedules.map((schedule, index) => {
    const reservations = activeItems.filter(item => item.schedule === schedule.value);
    const people = reservations.reduce((sum, item) => sum + item.num_people, 0);
    return { schedule, count: reservations.length, people, remain: SEATS_PER_SHOW - people, round: index + 1 };
  });

  const filtered = useMemo(() => {
    const list = activeSchedule === 'all' ? items : items.filter(item => item.schedule === activeSchedule);
    return [...list].sort((a, b) => Number(Boolean(a.admin_deleted_at)) - Number(Boolean(b.admin_deleted_at)));
  }, [items, activeSchedule]);
  const selectedRound = schedules.findIndex(schedule => schedule.value === activeSchedule) + 1;
  const selectedFilterLabel = activeSchedule === 'all' ? '전체 예매내역' : `${selectedRound}회차 예매내역`;
  const selectedSchedule = schedules.find(schedule => schedule.value === activeSchedule);
  const selectedCastMembers = selectedSchedule ? cast[selectedSchedule.cast].main.join(' · ') : '';
  const selectedActiveCount = activeSchedule === 'all'
    ? activeItems.length
    : activeItems.filter(item => item.schedule === activeSchedule).length;
  const selectedCanceledCount = filtered.filter(item => item.admin_deleted_at).length;

  const login = (event: React.FormEvent) => {
    event.preventDefault();
    setLoginError('');
    if (password !== ADMIN_PASSWORD) {
      setPassword('');
      setLoginError('비밀번호가 일치하지 않습니다.');
      return;
    }
    sessionStorage.setItem(ADMIN_SESSION_KEY, 'true');
    setLoggedIn(true);
  };

  const download = () => {
    const rows = [
      ['이름', '전화번호', '인원', '스케줄', '배우', '응원메세지', '상태', '예매일'],
      ...items.map(x => [
        x.name,
        x.phone,
        String(x.num_people),
        getCompactScheduleLabel(x.schedule),
        x.actor_name,
        x.message || '',
        x.admin_deleted_at ? '관리자 삭제' : '정상',
        new Date(x.created_at).toLocaleString('ko-KR'),
      ]),
    ];
    const csv = '\uFEFF' + rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = '1888_예매내역.csv';
    a.click();
  };

  const startEdit = (item: Reservation) => {
    setActionMessage('');
    setEditingId(item.id);
    setEditPeople(String(item.num_people));
    setEditSchedule(item.schedule);
  };

  const saveEdit = async (item: Reservation) => {
    const nextPeople = Number(editPeople);
    if (!Number.isInteger(nextPeople) || nextPeople < 1) {
      setActionMessage('인원수는 1명 이상으로 입력해주세요.');
      return;
    }

    setLoading(true);
    setActionMessage('');
    try {
      const { error } = await supabase.rpc('admin_update_reservation', {
        p_password: ADMIN_PASSWORD,
        p_id: item.id,
        p_num_people: nextPeople,
        p_schedule: editSchedule,
      });
      if (error) throw error;
      setItems(prev => prev.map(row => row.id === item.id ? { ...row, num_people: nextPeople, schedule: editSchedule } : row));
      syncGoogleSheet({ action: 'update', id: item.id, name: item.name, phone: item.phone, numPeople: nextPeople, schedule: editSchedule, actorName: item.actor_name, message: item.message || '' });
      setEditingId('');
      setActionMessage('예매 내역이 수정되었습니다.');
    } catch (error) {
      console.error(error);
      setActionMessage(error instanceof Error ? `수정하지 못했습니다. ${error.message}` : '수정하지 못했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const softDelete = async (item: Reservation) => {
    if (!window.confirm(`${item.name}님의 예매를 취소 처리할까요?\n확인 선택 시 예매 검색과 후기 입력에서 더 이상 조회되지 않습니다.`)) return;

    setLoading(true);
    setActionMessage('');
    try {
      const { data, error } = await supabase.rpc('admin_soft_delete_reservation', {
        p_password: ADMIN_PASSWORD,
        p_id: item.id,
      });
      if (error) throw error;
      const result = Array.isArray(data) ? data[0] : null;
      if (!result) throw new Error('삭제할 예매 내역을 찾지 못했습니다.');
      const deletedAt = result.admin_deleted_at || new Date().toISOString();
      setItems(prev => prev.map(row => row.id === item.id ? { ...row, admin_deleted_at: deletedAt } : row));
      syncGoogleSheet({ action: 'delete', id: item.id, name: item.name, phone: item.phone, schedule: item.schedule, actorName: item.actor_name, message: item.message || '' });
      setActionMessage('예매가 취소 처리되었습니다.');
    } catch (error) {
      console.error(error);
      setActionMessage(error instanceof Error ? `예매를 취소 처리하지 못했습니다. ${error.message}` : '예매를 취소 처리하지 못했습니다.');
    } finally {
      setLoading(false);
    }
  };

  if (!loggedIn) {
    return (
      <main className="admin-login">
        <form onSubmit={login} noValidate>
          <Lock />
          <p>1888 · ADMIN</p>
          <h1>관리자 로그인</h1>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="비밀번호" />
          {loginError && <p className="status-message">{loginError}</p>}
          <button className="primary">로그인</button>
          <button type="button" className="text-button" onClick={() => window.location.hash = '#/'}>홈으로 돌아가기</button>
        </form>
      </main>
    );
  }

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
          <div><span>총 예매</span><strong>{activeItems.length}</strong><small>건</small></div>
          <div><span>총 관람 인원</span><strong>{totalPeople}</strong><small>명</small></div>
          <div className="latest-summary"><span>최근 예매</span><strong>{latest}</strong><small>updated</small></div>
        </section>

        <div className="admin-tools">
          <div>
            <h2>Reservation List</h2>
            <p>회차별 칩을 선택해 예매 내역을 확인합니다.</p>
          </div>
        </div>

        <div className="admin-schedule-cards admin-schedule-tabs in-panel" aria-label="회차별 예매내역">
          <button type="button" className={activeSchedule === 'all' ? 'active' : ''} aria-pressed={activeSchedule === 'all'} onClick={() => setActiveSchedule('all')}>
            <strong>All</strong>
            <span>{activeItems.length}건 · {totalPeople}명</span>
          </button>
          {scheduleStats.map(({ schedule, count, people, remain, round }) => {
            return (
              <button type="button" key={schedule.value} className={activeSchedule === schedule.value ? 'active' : ''} aria-pressed={activeSchedule === schedule.value} onClick={() => setActiveSchedule(schedule.value)}>
                <strong>{round}회차</strong>
                <span>{count}건 · {people}명</span>
                <small>{remain.toLocaleString()}석</small>
              </button>
            );
          })}
        </div>

        <div className="reservation-list-context">
          <div>
            <span>Reservation List</span>
            <h2>{selectedFilterLabel}</h2>
            {selectedCastMembers && <small className="reservation-list-cast">{selectedCastMembers}</small>}
          </div>
          <p>정상 {selectedActiveCount}건{selectedCanceledCount > 0 ? ` · 취소 ${selectedCanceledCount}건` : ''}</p>
        </div>

        {actionMessage && <div className="admin-inline-message">{actionMessage}</div>}
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
          {filtered.map(item => {
            const isEditing = editingId === item.id;
            const isDeleted = Boolean(item.admin_deleted_at);
            return (
              <article key={item.id} className={isDeleted ? 'admin-reservation-card is-deleted' : 'admin-reservation-card'}>
                <header>
                  <div>
                    <h2>{item.name}</h2>
                    <p>{item.phone}</p>
                  </div>
                  <strong>{isDeleted ? '삭제됨' : `${item.num_people}명`}</strong>
                </header>

                {isEditing ? (
                  <div className="admin-edit-form">
                    <label>
                      <span>인원수</span>
                      <input type="number" min="1" value={editPeople} onChange={event => setEditPeople(event.target.value)} />
                    </label>
                    <label>
                      <span>회차</span>
                      <select value={editSchedule} onChange={event => setEditSchedule(event.target.value)}>
                        {schedules.map(schedule => <option key={schedule.value} value={schedule.value}>{getCompactScheduleLabel(schedule.value)}</option>)}
                      </select>
                    </label>
                    <div className="admin-card-actions">
                      <button type="button" className="admin-mini-button primary-mini" onClick={() => void saveEdit(item)} disabled={loading}><Save size={14} /> 저장</button>
                      <button type="button" className="admin-mini-button" onClick={() => setEditingId('')}><X size={14} /> 취소</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <dl>
                      <div><dt>회차</dt><dd>{getCompactScheduleLabel(item.schedule)}</dd></div>
                      {item.message && <div><dt>응원</dt><dd>{item.message}</dd></div>}
                    </dl>
                    {!isDeleted && (
                      <div className="admin-card-actions">
                        <button type="button" className="admin-mini-button" onClick={() => startEdit(item)}><Edit3 size={14} /> 수정</button>
                        <button type="button" className="admin-mini-button danger-mini" onClick={() => void softDelete(item)} disabled={loading}><Trash2 size={14} /> 삭제</button>
                      </div>
                    )}
                  </>
                )}
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}
