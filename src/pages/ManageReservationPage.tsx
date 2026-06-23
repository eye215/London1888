import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Search, Trash2 } from 'lucide-react';
import { cast, getScheduleLabel, schedules } from '../data/show';
import { isDatabaseConfigured, supabase } from '../lib/supabase';
import { syncGoogleSheet } from '../lib/googleSheet';

type FoundReservation = {
  id: string;
  num_people: number;
  schedule: string;
  actor_name: string;
  created_at: string;
};

const formatPhone = (value: string) => {
  const n = value.replace(/\D/g, '').slice(0, 11);
  return n.length <= 3 ? n : n.length <= 7 ? `${n.slice(0, 3)}-${n.slice(3)}` : `${n.slice(0, 3)}-${n.slice(3, 7)}-${n.slice(7)}`;
};

export default function ManageReservationPage() {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [reservation, setReservation] = useState<FoundReservation | null>(null);
  const [numPeople, setNumPeople] = useState('');
  const [schedule, setSchedule] = useState('');
  const [status, setStatus] = useState('');
  const [working, setWorking] = useState(false);

  const selectedSchedule = useMemo(() => schedules.find(item => item.value === schedule), [schedule]);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    const saved = sessionStorage.getItem('reservationLookup');
    if (!saved) return;
    sessionStorage.removeItem('reservationLookup');
    try {
      const lookup = JSON.parse(saved) as { name?: string; phone?: string };
      setName(lookup.name || '');
      setPhone(lookup.phone || '');
    } catch {
      // 임시 조회 데이터는 무시합니다.
    }
  }, []);

  const findReservation = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('');
    setReservation(null);

    if (!name.trim() || !/^010-\d{4}-\d{4}$/.test(phone)) {
      setStatus('실명과 전화번호를 정확히 입력해주세요.');
      return;
    }
    if (!isDatabaseConfigured) {
      setStatus('데이터베이스 연결 정보를 확인해주세요.');
      return;
    }

    setWorking(true);
    const { data, error } = await supabase.rpc('find_reservation_by_contact', { p_name: name.trim(), p_phone: phone });
    setWorking(false);

    if (error) {
      console.error(error);
      setStatus('예매 내역을 확인하는 중 오류가 발생했습니다.');
      return;
    }

    const found = Array.isArray(data) ? data[0] : null;
    if (!found) {
      setStatus('입력하신 정보와 일치하는 예매 내역이 없습니다.');
      return;
    }

    setReservation(found as FoundReservation);
    setNumPeople(String(found.num_people));
    setSchedule(found.schedule);
  };

  const updateReservation = async () => {
    if (!reservation) return;
    if (!numPeople || Number(numPeople) < 1 || !schedule) {
      setStatus('수정할 인원과 일정을 확인해주세요.');
      return;
    }

    setWorking(true);
    const { data, error } = await supabase.rpc('update_reservation_by_contact', {
      p_name: name.trim(),
      p_phone: phone,
      p_num_people: Number(numPeople),
      p_schedule: schedule,
    });
    setWorking(false);

    if (error || !Array.isArray(data) || data.length === 0) {
      console.error(error);
      setStatus('예매 정보를 수정하지 못했습니다. 다시 확인해주세요.');
      return;
    }

    syncGoogleSheet({ action: 'update', id: reservation.id, name: name.trim(), phone, numPeople: Number(numPeople), schedule, actorName: reservation.actor_name });
    localStorage.setItem('toastMessage', '예매 정보가 수정되었습니다.');
    window.location.hash = '#/';
  };

  const cancelReservation = async () => {
    if (!reservation) return;
    if (!window.confirm('예매를 취소할까요? 취소된 예매 내역은 복구할 수 없습니다.')) return;

    setWorking(true);
    const { data, error } = await supabase.rpc('cancel_reservation_by_contact', { p_name: name.trim(), p_phone: phone });
    setWorking(false);

    if (error || !Array.isArray(data) || data.length === 0) {
      console.error(error);
      setStatus('예매를 취소하지 못했습니다. 다시 확인해주세요.');
      return;
    }

    syncGoogleSheet({ action: 'delete', id: reservation.id, name: name.trim(), phone, schedule: reservation.schedule, actorName: reservation.actor_name });
    localStorage.setItem('toastMessage', '예매내역이 삭제되었습니다.');
    window.location.hash = '#/';
  };

  return (
    <main className="utility-page manage-page">
      <header className="booking-header">
        <button className="text-button" onClick={() => window.location.hash = '#/'}><ArrowLeft size={18} /> 돌아가기</button>
        <span>1888 · CHANGE REQUEST</span>
      </header>

      <section className="utility-hero">
        <p>RESERVATION CARE</p>
        <h1>갑자기 일정이<br />변경되셨나요?</h1>
        <span>예매 시 입력한 실명과 전화번호로 내역을 확인한 뒤 인원과 관람 일정을 변경하거나 예매를 취소할 수 있습니다.</span>
      </section>

      <section className="utility-card">
        <form onSubmit={findReservation} className="lookup-form">
          <Field label="예매자 실명"><input value={name} onChange={e => setName(e.target.value)} placeholder="실명을 입력해주세요" /></Field>
          <Field label="전화번호"><input inputMode="numeric" value={phone} onChange={e => setPhone(formatPhone(e.target.value))} placeholder="010-0000-0000" /></Field>
          <button className="submit-button" disabled={working}><Search size={18} /> 예매확인</button>
        </form>

        {status && <p className="status-message">{status}</p>}

        {reservation && (
          <div className="manage-result">
            <div className="display-card reservation-summary">
              <span>현재 예매 정보</span>
              <strong>{getScheduleLabel(reservation.schedule)}</strong>
              <p>{reservation.num_people}명 · {reservation.actor_name}</p>
            </div>

            <div className="edit-control-panel">
              <h2>변경할 정보</h2>
              <div className="field-row">
                <Field label="예매 인원"><input type="number" min="1" value={numPeople} onChange={e => setNumPeople(e.target.value)} /></Field>
                <Field label="관람 일정">
                  <select value={schedule} onChange={e => setSchedule(e.target.value)}>
                    {schedules.map(item => <option key={item.value} value={item.value}>{getScheduleLabel(item.value)}</option>)}
                  </select>
                </Field>
              </div>
            </div>

            {selectedSchedule && (
              <div className="cast-preview-card display-card">
                <span>변경 선택 · CAST {selectedSchedule.cast}</span>
                <strong>{cast[selectedSchedule.cast].main.join(' · ')}</strong>
                <p>앙상블 · {cast[selectedSchedule.cast].ensemble.join(' · ')}</p>
              </div>
            )}

            <div className="manage-actions">
              <button className="primary" onClick={updateReservation} disabled={working}>수정완료</button>
              <button className="danger-button" onClick={cancelReservation} disabled={working}><Trash2 size={17} /> 예매 취소</button>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="field"><span className="field-label">{label}</span>{children}</label>;
}
