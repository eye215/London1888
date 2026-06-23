export type CastType = 'A' | 'B';

export type Schedule = {
  value: string;
  date: string;
  shortDate: string;
  time: string;
  cast: CastType;
};

export const schedules: Schedule[] = [
  { value: '2026-07-25 13:00', date: '07.25 SAT', shortDate: '7/25', time: '1PM', cast: 'A' },
  { value: '2026-07-25 16:00', date: '07.25 SAT', shortDate: '7/25', time: '4PM', cast: 'B' },
  { value: '2026-07-26 13:00', date: '07.26 SUN', shortDate: '7/26', time: '1PM', cast: 'B' },
  { value: '2026-07-26 16:00', date: '07.26 SUN', shortDate: '7/26', time: '4PM', cast: 'A' },
];

export const cast = {
  A: {
    main: ['도영', '준범', '영완', '양욱', '은비', '유리'],
    ensemble: ['흥섭', '병주', '해찬', '오현', '채린'],
  },
  B: {
    main: ['병주', '준범', '해찬', '오현', '채린', '유리'],
    ensemble: ['흥섭', '도영', '영완', '양욱', '은비'],
  },
} satisfies Record<CastType, { main: string[]; ensemble: string[] }>;

export const allActors = Array.from(new Set([...cast.A.main, ...cast.A.ensemble, ...cast.B.main, ...cast.B.ensemble]));

export const getScheduleLabel = (value: string) => {
  const item = schedules.find(schedule => schedule.value === value);
  return item ? `${item.date} · ${item.time} · CAST ${item.cast}` : value;
};

export const getCompactScheduleLabel = (value: string) => {
  const item = schedules.find(schedule => schedule.value === value);
  return item ? `${item.date} ${item.time}` : value;
};
