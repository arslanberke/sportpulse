-- BSD exposes stable team images at /img/team/{id}/. Fill only missing logos;
-- official/Wikipedia/ESPN crests already present remain untouched.

update public.teams
set logo_url = 'https://sports.bzzoiro.com/img/team/' || (external_ids->>'bsd') || '/'
where (logo_url is null or logo_url = '')
  and external_ids ? 'bsd';
