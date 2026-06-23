import { useState } from 'react';
import { ArrowLeft, Search } from 'lucide-react';
import { getScheduleLabel } from '../data/show';
import { isDatabaseConfigured, supabase } from '../lib/supabase';

type FoundReservation = {
  id: string;
  num_people: number;
  schedule: string;
  actor_name: string;
};

const TEST_NAME = '김유리';
const TEST_PHONE = '01092974813';

const formatPhone = (value: string) => {
  const n = value.replace(/\D/g, '').slice(0, 11);
  return n.length <= 3 ? n : n.length <= 7 ? `${n.slice(0, 3)}-${n.slice(3)}` : `${n.slice(0, 3)}-${n.slice(3, 7)}-${n.slice(7)}`;
};

const hasShowStarted = (schedule: string) => new Date(`${schedule.replace(' ', 'T')}:00+09:00`).getTime() <= Date.now();

export default function ReviewCheckPage() {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [status, setStatus] = useState('');
  const [working, setWorking] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setStatus('');
    const normalizedPhone = phone.replace(/\D/g, '');
    const isTester = name.trim() === TEST_NAME && normalizedPhone === TEST_PHONE;

    if (!name.trim() || normalizedPhone.length !== 11) {
      setStatus('예매 시 입력한 실명과 전화번호를 정확히 입력해주세요.');
      return;
    }
    if (!isDatabaseConfigured) {
      setStatus('데이터베이스 연결 정보를 확인해주세요.');
      return;
    }

    setWorking(true);
    const { data, error } = await supabase.rpc('find_reservation_by_contact', {
      p_name: name.trim(),
      p_phone: formatPhone(normalizedPhone),
    });
    setWorking(false);

    if (error && !isTester) {
      console.error(error);
      setStatus('예매 내역을 확인하지 못했습니다. 잠시 후 다시 시도해주세요.');
      return;
    }

    const found = (Array.isArray(data) ? data[0] : null) as FoundReservation | null;
    if (!found && !isTester) {
      setStatus('일치하는 예매 내역이 없습니다.');
      return;
    }

    const schedule = found?.schedule || '2026-07-25 13:00';
    if (!isTester && !hasShowStarted(schedule)) {
      localStorage.setItem('toastMessage', '아직 공연 후기를 입력할 수 없습니다.');
      window.location.hash = '#/';
      return;
    }

    sessionStorage.setItem('reviewAccess', JSON.stringify({
      reservationId: found?.id || null,
      name: name.trim(),
      phone: formatPhone(normalizedPhone),
      schedule,
      scheduleLabel: getScheduleLabel(schedule),
      isTester,
    }));
    window.location.hash = '#/review';
  };

  return (
    <main className="utility-page review-check-page">
      <header className="booking-header">
        <button className="text-button" onClick={() => window.location.hash = '#/'}><ArrowLeft size={18} /> 돌아가기</button>
        <span>1888 · AUDIENCE REVIEW</span>
      </header>
      <section className="utility-hero">
        <p>AFTER THE CURTAIN</p>
        <h1>당신이 목격한 밤을<br />들려주세요</h1>
        <span>공연 후 예매자 확인을 거쳐 배우에게만 공개되는 후기를 남길 수 있습니다.</span>
      </section>
      <section className="utility-card">
        <form onSubmit={submit} className="review-lookup-form">
          <label className="field"><span className="field-label">예매자 실명</span><input value={name} onChange={e => setName(e.target.value)} placeholder="실명을 입력해주세요" /></label>
          <label className="field"><span className="field-label">전화번호</span><input inputMode="numeric" value={phone} onChange={e => setPhone(formatPhone(e.target.value))} placeholder="010-0000-0000" /></label>
          {status && <p className="status-message">{status}</p>}
          <button className="submit-button" disabled={working}><Search size={18} /> {working ? '예매 확인 중' : '예매자 확인'}</button>
        </form>
      </section>
    </main>
  );
}
