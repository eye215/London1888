import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Check, ChevronRight } from 'lucide-react';
import { allActors, cast, getScheduleLabel, schedules } from '../data/show';
import { TEAM_ACTOR_NAME, getActorDisplayName, isTeamActor } from '../lib/actors';
import { isDatabaseConfigured, supabase } from '../lib/supabase';
import { syncGoogleSheet } from '../lib/googleSheet';

type FormData = {
  name: string;
  numPeople: string;
  phone: string;
  phoneConfirm: string;
  schedule: string;
  actors: string[];
  message: string;
  privacyAgreed: boolean;
};

type ExistingReservation = {
  id: string;
  num_people: number;
  schedule: string;
  actor_name: string;
};

const formatPhone = (value: string) => {
  const n = value.replace(/\D/g, '').slice(0, 11);
  return n.length <= 3 ? n : n.length <= 7 ? `${n.slice(0, 3)}-${n.slice(3)}` : `${n.slice(0, 3)}-${n.slice(3, 7)}-${n.slice(7)}`;
};

const maskName = (value: string) => {
  const name = value.trim();
  if (name.length <= 1) return name;
  if (name.length === 2) return `${name[0]}*`;
  return `${name[0]}${'*'.repeat(name.length - 2)}${name[name.length - 1]}`;
};

const getLast4 = (phone: string) => phone.replace(/\D/g, '').slice(-4);
const asset = (path: string) => `${import.meta.env.BASE_URL}${path}`.replace(/\/+/g, '/');
const errorOrder: (keyof FormData)[] = ['name', 'numPeople', 'phone', 'phoneConfirm', 'schedule', 'actors', 'privacyAgreed'];

export default function BookingPage() {
  const [form, setForm] = useState<FormData>({ name: '', numPeople: '', phone: '', phoneConfirm: '', schedule: '', actors: [], message: '', privacyAgreed: false });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [existingReservation, setExistingReservation] = useState<ExistingReservation | null>(null);

  useEffect(() => window.scrollTo({ top: 0, left: 0, behavior: 'auto' }), []);

  const selectedSchedule = useMemo(() => schedules.find(s => s.value === form.schedule), [form.schedule]);
  const actorChoices = useMemo(() => {
    if (!selectedSchedule) return allActors.map(name => ({ name, role: '일정 선택 후 확인' }));
    const currentCast = cast[selectedSchedule.cast];
    return [
      ...currentCast.main.map(name => ({ name, role: '배역' })),
      ...currentCast.ensemble.map(name => ({ name, role: '앙상블' })),
    ];
  }, [selectedSchedule]);
  const selectableActorNames = actorChoices.map(actor => actor.name);

  const update = (key: keyof FormData, value: string | string[] | boolean) => {
    setForm(prev => ({ ...prev, [key]: value }));
    setErrors(prev => ({ ...prev, [key]: '' }));
  };

  const toggleAllActors = () => {
    update('actors', isTeamActor(form.actors) ? [] : [TEAM_ACTOR_NAME]);
  };

  const toggleActor = (name: string) => {
    const base = isTeamActor(form.actors) ? [] : form.actors;
    const next = base.includes(name) ? base.filter(a => a !== name) : [...base, name];
    const allSelected = selectableActorNames.length > 0 && selectableActorNames.every(actor => next.includes(actor));
    update('actors', allSelected ? [TEAM_ACTOR_NAME] : next);
  };

  const scrollToFirstError = (next: Record<string, string>) => {
    const first = errorOrder.find(key => next[key]);
    if (!first) return;
    window.setTimeout(() => {
      document.querySelector(`[data-field="${first}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 30);
  };

  const getValidationErrors = () => {
    const next: Record<string, string> = {};
    if (!form.name.trim()) next.name = '예매자 실명을 입력해주세요.';
    if (!form.numPeople || Number(form.numPeople) < 1) next.numPeople = '예매 인원은 1명 이상 입력해주세요.';
    if (!/^010-\d{4}-\d{4}$/.test(form.phone)) next.phone = '010-0000-0000 형식으로 입력해주세요.';
    if (!form.phoneConfirm) next.phoneConfirm = '전화번호를 한 번 더 입력해주세요.';
    else if (form.phone !== form.phoneConfirm) next.phoneConfirm = '전화번호가 일치하지 않습니다.';
    if (!form.schedule) next.schedule = '공연 일정을 선택해주세요.';
    if (!form.actors.length) next.actors = '응원할 배우를 1명 이상 선택해주세요.';
    if (!form.privacyAgreed) next.privacyAgreed = '개인정보 수집·이용에 동의해주세요.';
    return next;
  };

  const validate = () => {
    const next = getValidationErrors();
    setErrors(next);
    scrollToFirstError(next);
    return Object.keys(next).length === 0;
  };

  const canSubmit = Object.keys(getValidationErrors()).length === 0 && !submitting;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    if (!isDatabaseConfigured) {
      alert('데이터베이스 연결 정보가 없습니다. Supabase 설정을 확인해주세요.');
      return;
    }

    setSubmitting(true);
    try {
      const { data: existingData, error: lookupError } = await supabase.rpc('find_reservation_by_contact', {
        p_name: form.name.trim(),
        p_phone: form.phone,
      });
      if (lookupError) throw lookupError;

      const existing = Array.isArray(existingData) ? existingData[0] : null;
      if (existing) {
        setExistingReservation(existing as ExistingReservation);
        return;
      }

      const actorNames = getActorDisplayName(form.actors);
      const reservationId = crypto.randomUUID();
      const { error } = await supabase.from('reservations').insert({
        id: reservationId,
        name: form.name.trim(),
        phone: form.phone,
        num_people: Number(form.numPeople),
        schedule: form.schedule,
        actor_name: actorNames,
      });
      if (error) throw error;

      const bookingNumber = reservationId.slice(0, 8).toUpperCase();
      if (form.message.trim()) {
        const authorDisplay = `${maskName(form.name)}(${getLast4(form.phone)})`;
        const { error: messageError } = await supabase.from('messages').insert({
          reservation_id: reservationId,
          actor_name: actorNames,
          message: form.message.trim(),
          booking_number: bookingNumber,
          author_name: form.name.trim(),
          author_phone_last4: getLast4(form.phone),
          author_display: authorDisplay,
          source: 'reservation',
        });
        if (messageError) throw messageError;
      }

      syncGoogleSheet({
        action: 'create',
        id: reservationId,
        bookingNumber,
        name: form.name.trim(),
        phone: form.phone,
        numPeople: Number(form.numPeople),
        schedule: form.schedule,
        actorName: actorNames,
        message: form.message.trim(),
        createdAt: new Date().toISOString(),
      });

      localStorage.setItem('reservationInfo', JSON.stringify({ bookingNumber, name: form.name, actor: actorNames, schedule: form.schedule }));
      localStorage.setItem('toastMessage', '예매가 완료되었습니다.');
      window.location.href = '/London1888/#/';
    } catch (error) {
      console.error(error);
      alert('예매 저장 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setSubmitting(false);
    }
  };

  const goToManage = () => {
    sessionStorage.setItem('reservationLookup', JSON.stringify({ name: form.name.trim(), phone: form.phone }));
    window.location.hash = '#/manage';
  };

  return (
    <main className="booking-page">
      <header className="booking-header">
        <button className="text-button" onClick={() => window.location.hash = '#/'}><ArrowLeft size={18} /> 돌아가기</button>
        <span>1888 · RESERVATION</span>
      </header>

      {existingReservation && (
        <div className="duplicate-modal-backdrop" role="presentation">
          <section className="duplicate-modal" role="dialog" aria-modal="true" aria-labelledby="duplicate-title">
            <p>RESERVATION FOUND</p>
            <h2 id="duplicate-title">예매내역이 있습니다.</h2>
            <div className="duplicate-reservation-info">
              <span>{getScheduleLabel(existingReservation.schedule)}</span>
              <strong>{existingReservation.num_people}명</strong>
              <small>{existingReservation.actor_name}</small>
            </div>
            <p className="duplicate-question">예매 내역을 수정하시겠습니까?</p>
            <div className="duplicate-actions">
              <button type="button" className="primary" onClick={goToManage}>확인</button>
              <button type="button" className="modal-cancel" onClick={() => setExistingReservation(null)}>취소</button>
            </div>
          </section>
        </div>
      )}

      <div className="booking-layout">
        <aside className="booking-poster">
          <div className="booking-poster-inner">
            <p>THE NIGHT OF LONDON</p>
            <img src={asset('assets/show-title.png')} alt="1888, 런던의 밤" />
            <span>2026. 07. 25 — 07. 26</span>
          </div>
        </aside>

        <section className="form-panel">
          <div className="form-heading">
            <p>RESERVATION</p>
            <h2>당신의 밤을<br />예약하세요</h2>
            <span><b>*</b> 표시는 필수 입력 항목입니다.</span>
          </div>

          <form onSubmit={submit} noValidate>
            <FormSection number="01" title="예매자 정보" description="예매 확인 및 변경에 사용할 정보를 입력해주세요.">
              <div className="field-row">
                <Field id="name" label="예매자 실명" error={errors.name}>
                  <input aria-label="예매자 실명" value={form.name} onChange={e => update('name', e.target.value)} placeholder="실명을 입력해주세요" />
                </Field>
                <Field id="numPeople" label="인원수" error={errors.numPeople}>
                  <input aria-label="인원수" type="number" min="1" value={form.numPeople} onChange={e => update('numPeople', e.target.value)} placeholder="1" />
                </Field>
              </div>
              <div className="field-row">
                <Field id="phone" label="전화번호" error={errors.phone}>
                  <input aria-label="전화번호" inputMode="numeric" value={form.phone} onChange={e => update('phone', formatPhone(e.target.value))} placeholder="010-0000-0000" />
                </Field>
                <Field id="phoneConfirm" label="전화번호 확인" error={errors.phoneConfirm}>
                  <input aria-label="전화번호 확인" inputMode="numeric" value={form.phoneConfirm} onChange={e => update('phoneConfirm', formatPhone(e.target.value))} placeholder="한 번 더 입력해주세요" />
                </Field>
              </div>
            </FormSection>

            <FormSection number="02" title="공연 선택" description="관람할 날짜와 시간을 선택해주세요.">
              <Field id="schedule" label="스케줄" error={errors.schedule}>
                <div className="option-grid schedule-options">
                  {schedules.map(s => (
                    <button type="button" key={s.value} className={form.schedule === s.value ? 'option selected' : 'option'} onClick={() => { update('schedule', s.value); update('actors', []); }}>
                      <span>{s.date}</span>
                      <strong>{s.time}</strong>
                      <small>CAST {s.cast}</small>
                    </button>
                  ))}
                </div>
              </Field>
            </FormSection>

            <FormSection number="03" title="배우 선택" description="응원할 배우를 여러 명 선택할 수 있습니다.">
              <Field id="actors" label="응원할 배우" error={errors.actors}>
                <p className="field-help">
                  {selectedSchedule ? `CAST ${selectedSchedule.cast} · 배역 6명 / 앙상블 5명` : '공연 스케줄을 먼저 선택해주세요.'}
                </p>
                <div className="actor-grid">
                  <button type="button" disabled={!selectedSchedule} onClick={toggleAllActors} className={isTeamActor(form.actors) ? 'actor selected all-actor' : 'actor all-actor'}>
                    <span>{isTeamActor(form.actors) && <Check size={14} />}</span>
                    <b>전체선택</b>
                    <small>팀 전체</small>
                  </button>
                  {actorChoices.map(({ name, role }) => (
                    <button type="button" disabled={!selectedSchedule || isTeamActor(form.actors)} key={`${name}-${role}`} onClick={() => toggleActor(name)} className={form.actors.includes(name) ? 'actor selected' : 'actor'}>
                      <span>{form.actors.includes(name) && <Check size={14} />}</span>
                      <b>{name}</b>
                      <small>{role}</small>
                    </button>
                  ))}
                </div>
              </Field>
            </FormSection>

            <FormSection number="04" title="응원 메시지" description="메인 화면의 응원의 마음 영역에 함께 노출됩니다.">
              <Field id="message" label="메시지" required={false}>
                <textarea aria-label="응원 메시지" value={form.message} onChange={e => update('message', e.target.value.slice(0, 300))} rows={5} placeholder="배우에게 전하고 싶은 마음을 남겨주세요." />
                <div className="counter">{form.message.length} / 300</div>
              </Field>
            </FormSection>

            <FormSection number="05" title="개인정보 수집·이용 동의" description="예매 확인과 관리를 위해 필요한 최소 정보만 수집합니다.">
              <div className="privacy-box">
                <p><strong>수집 항목</strong> 이름, 휴대전화번호</p>
                <p><strong>이용 목적</strong> 공연 예매자 확인 및 관리</p>
                <p><strong>보유 기간</strong> 공연 종료 후 1개월(2026.08.31.)까지 보관 후 즉시 파기</p>
                <small>※ 개인정보 수집·이용에 동의하지 않을 권리가 있으나, 동의하지 않을 경우 예매 확인 및 관리가 제한될 수 있습니다.</small>
              </div>
              <div className="field" data-field="privacyAgreed">
                <label className={form.privacyAgreed ? 'privacy-check checked' : 'privacy-check'}>
                  <input type="checkbox" checked={form.privacyAgreed} onChange={e => update('privacyAgreed', e.target.checked)} />
                  <span>{form.privacyAgreed && <Check size={14} />}</span>
                  개인정보 수집·이용에 동의합니다.
                </label>
                {errors.privacyAgreed && <em className="error">{errors.privacyAgreed}</em>}
              </div>
            </FormSection>

            <button className="submit-button" disabled={!canSubmit}>
              {submitting ? '예매 저장 중' : <>예매 완료 <ChevronRight /></>}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}

function Field({ id, label, error, children, required = true }: { id: string; label: string; error?: string; children: React.ReactNode; required?: boolean }) {
  return <div className="field" data-field={id}><span className="field-label">{label}{required && <i>*</i>}</span>{children}{error && <em className="error">{error}</em>}</div>;
}

function FormSection({ number, title, description, children }: { number: string; title: string; description: string; children: React.ReactNode }) {
  return <section className="form-section"><header><span>{number}</span><div><h3>{title}</h3><p>{description}</p></div></header>{children}</section>;
}
