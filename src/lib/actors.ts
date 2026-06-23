export const TEAM_ACTOR_NAME = '1888 런던의밤 팀';

export const isTeamActor = (actors: string[] | string) => {
  if (Array.isArray(actors)) return actors.includes(TEAM_ACTOR_NAME);
  return actors === TEAM_ACTOR_NAME;
};

export const getActorDisplayName = (actors: string[]) => {
  if (isTeamActor(actors)) return TEAM_ACTOR_NAME;
  return actors.join(', ');
};
