// BSD football player data: profile, career season aggregates, squad lists and
// free-text search. Player rows live only at the provider (they are not synced
// into the `players` table), so every query is a live upstream call keyed by
// the BSD player/team id carried in lineup caches and `teams.external_ids.bsd`.

import { createClient } from 'jsr:@supabase/supabase-js@2';
const CORS={ 'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS' };
const json=(body:unknown,status=200)=>Response.json(body,{status,headers:CORS});
function object(value:unknown):Record<string,unknown>{if(!value||typeof value!=='object'||Array.isArray(value))return{};return value as Record<string,unknown>}
function text(value:unknown){return typeof value==='string'&&value.trim()?value:null}
function number(value:unknown){if(typeof value==='number'&&Number.isFinite(value))return value;if(typeof value==='string'&&value!==''&&Number.isFinite(Number(value)))return Number(value);return null}
async function hasUser(supabase:ReturnType<typeof createClient>,request:Request){const jwt=(request.headers.get('Authorization')??'').replace(/^Bearer\s+/i,'').trim();return jwt?((await supabase.auth.getUser(jwt)).data.user!==null):false}
async function api(path:string,key:string){const response=await fetch(`https://sports.bzzoiro.com/api/v2${path}`,{headers:{Authorization:`Token ${key}`},signal:AbortSignal.timeout(15000)});if(!response.ok)throw new Error(`http_${response.status}`);return response.json()}
const photo=(id:number)=>`https://sports.bzzoiro.com/img/player/${id}/?sor=true&bg=transparent`;
const teamLogo=(id:number)=>`https://sports.bzzoiro.com/img/team/${id}/`;
// League names for career rows: BSD ids whose names we already know in-app.
// Anything else is resolved from the leagues table (external_ids.bsd).
const KNOWN_LEAGUES:Record<number,string>={1:'Premier League',2:'Primeira Liga',3:'LaLiga',4:'Serie A',5:'Bundesliga',6:'Ligue 1',7:'UEFA Champions League',8:'UEFA Europa League',10:'Eredivisie',11:'Süper Lig',31:'Milli Hazırlık Maçları',39:'FA Cup',40:'Carabao Cup',41:'Copa del Rey',42:'Coppa Italia',43:'DFB-Pokal',44:'Coupe de France',58:'Dünya Kupası Elemeleri – Avrupa',64:'UEFA Nations League',83:'UEFA Conference League',90:'UEFA Super Cup'};
Deno.serve(async request=>{if(request.method==='OPTIONS')return new Response('ok',{headers:CORS});let kind:string|null=null,playerId:string|null=null,teamId:string|null=null,query:string|null=null,seasonId:string|null=null,leagueId:string|null=null;try{const body=await request.json();if(typeof body.kind==='string')kind=body.kind;if(typeof body.playerId==='string')playerId=body.playerId;if(typeof body.teamId==='string')teamId=body.teamId;if(typeof body.query==='string')query=body.query;if(typeof body.seasonId==='string')seasonId=body.seasonId;if(typeof body.leagueId==='string')leagueId=body.leagueId}catch{}if(!['search','squad','profile','matches'].includes(kind??''))return json({error:'kind required'},400);
  const supabase=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);if(!(await hasUser(supabase,request)))return json({error:'unauthorized'},401);const key=Deno.env.get('API_BSD_FOOTBALL_KEY');if(!key)return json({available:false,reason:'not_configured'});
  try{
    if(kind==='search'){if(!query||query.trim().length<2)return json({players:[]});const body=await api(`/players/?name=${encodeURIComponent(query.trim())}&limit=15`,key);const rows=Array.isArray(body.results)?body.results:[];return json({players:rows.map((value:unknown)=>{const p=object(value);const team=object(p.current_team);const tid=number(p.current_team_id);return{id:String(number(p.id)??p.name),name:text(p.name)??'',position:text(p.position),jerseyNumber:number(p.jersey_number),nationality:text(p.nationality),teamId:tid!==null?String(tid):null,teamName:text(team.name),teamLogoUrl:tid!==null?teamLogo(tid):null,photoUrl:number(p.id)!==null?photo(number(p.id)!):null}})})}
    if(kind==='squad'){if(!teamId)return json({error:'teamId required'},400);const body=await api(`/teams/${teamId}/squad/`,key);const rows=Array.isArray(body.players)?body.players:[];return json({players:rows.map((value:unknown)=>{const p=object(value);const pid=number(p.id);return{id:String(pid??p.name),name:text(p.name)??'',position:text(p.position),jerseyNumber:number(p.jersey_number),nationality:text(p.nationality),dateOfBirth:text(p.date_of_birth),availability:text(p.availability),injuryType:text(p.injury_type)||null,injuryExpectedReturn:text(p.injury_expected_return),photoUrl:pid!==null?photo(pid):null}})})}
    if(kind==='matches'){
      // Bir sezon+lig icin oyuncunun mac mac logu. event_id uzerinden kendi
      // events tablomuza eslenir; bulunamayanlar icin BSD detayi cekilir.
      if(!playerId||!seasonId)return json({error:'playerId and seasonId required'},400);
      let path=`/players/${playerId}/stats/?season_id=${seasonId}&limit=200`;
      if(leagueId)path+=`&league_id=${leagueId}`;
      if(teamId)path+=`&team_id=${teamId}`;
      const stats:Record<string,unknown>[]=[];let offset=0;
      for(let i=0;i<3;i++){const body=await api(`${path}&offset=${offset}`,key);const rows=Array.isArray(body?.results)?body.results.map(object):[];stats.push(...rows);if(!body?.next||!rows.length)break;offset+=rows.length}
      const eventIds=[...new Set(stats.map(s=>number(s.event_id)).filter((v):v is number=>v!==null))];
      type Ev={id:string|null;date:string|null;home:string|null;away:string|null;homeBsd:number|null;awayBsd:number|null;homeScore:number|null;awayScore:number|null};
      const evByBsd=new Map<number,Ev>();
      if(eventIds.length){
        const{data:evRows}=await supabase.from('events').select('id,starts_at,home_score,away_score,external_ids,home_team:teams!home_team_id(name,external_ids),away_team:teams!away_team_id(name,external_ids)').in('external_ids->>bsd',eventIds.map(String));
        for(const row of evRows??[]){const bsd=number(object(row.external_ids).bsd);if(bsd===null)continue;const home=object(row.home_team),away=object(row.away_team);
          evByBsd.set(bsd,{id:String(row.id),date:text(row.starts_at),home:text(home.name),away:text(away.name),homeBsd:number(object(home.external_ids).bsd),awayBsd:number(object(away.external_ids).bsd),homeScore:number(row.home_score),awayScore:number(row.away_score)});}
      }
      const missing=eventIds.filter(id=>!evByBsd.has(id)).slice(0,25);
      await Promise.all(missing.map(async eid=>{try{const e=object(await api(`/events/${eid}/`,key));evByBsd.set(eid,{id:null,date:text(e.event_date),home:text(e.home_team),away:text(e.away_team),homeBsd:number(e.home_team_id),awayBsd:number(e.away_team_id),homeScore:number(e.home_score),awayScore:number(e.away_score)})}catch{/* mac detayi yok */}}));
      const matches=stats.map(s=>{const eid=number(s.event_id);const ev=eid!==null?evByBsd.get(eid):undefined;const myTeam=number(s.team_id);
        const isHome=ev&&myTeam!==null?(ev.homeBsd===myTeam?true:ev.awayBsd===myTeam?false:null):null;
        return{eventId:ev?.id??null,bsdEventId:eid,date:ev?.date??null,opponentName:ev?(isHome===true?ev.away:isHome===false?ev.home:null):null,isHome,homeScore:ev?.homeScore??null,awayScore:ev?.awayScore??null,minutes:number(s.minutes_played),goals:number(s.goals),assists:number(s.goal_assist),rating:number(s.rating)};
      }).sort((a,b)=>(b.date??'').localeCompare(a.date??''));
      return json({matches});
    }
    if(!playerId)return json({error:'playerId required'},400);
    const[profileBody,careerBody]=await Promise.all([api(`/players/${playerId}/`,key),api(`/players/${playerId}/career/`,key).catch(()=>null)]);
    const p=object(profileBody);const pid=number(p.id);const seasons=Array.isArray(careerBody?.seasons)?careerBody.seasons.map((value:unknown)=>object(value)):[];
    const teamIds=[...new Set([number(p.current_team_id),number(p.national_team_id),...seasons.map(s=>number(s.team_id))].filter((v):v is number=>v!==null))];
    const leagueIds=[...new Set(seasons.map(s=>number(s.league_id)).filter((v):v is number=>v!==null))];
    const[teamRows,leagueRows]=await Promise.all([
      teamIds.length?supabase.from('teams').select('name,logo_url,external_ids').in('external_ids->>bsd',teamIds.map(String)):Promise.resolve({data:[]}),
      leagueIds.length?supabase.from('leagues').select('name,external_ids').in('external_ids->>bsd',leagueIds.map(String)):Promise.resolve({data:[]}),
    ]);
    const teamInfo=new Map<number,{name:string|null;logo:string|null}>();for(const row of teamRows.data??[]){const bsd=Number(object(row.external_ids).bsd);if(Number.isFinite(bsd))teamInfo.set(bsd,{name:text(row.name),logo:text(row.logo_url)})}
    const leagueName=new Map<number,string>();for(const row of leagueRows.data??[]){const bsd=Number(object(row.external_ids).bsd);const name=text(row.name);if(Number.isFinite(bsd)&&name)leagueName.set(bsd,name)}
    const resolveTeam=(id:number|null)=>{if(id===null)return{name:null,logo:null};const known=teamInfo.get(id);return{name:known?.name??null,logo:known?.logo??teamLogo(id)}};
    const currentTeamId=number(p.current_team_id);const nationalTeamId=number(p.national_team_id);const currentTeam=resolveTeam(currentTeamId);
    // Sezon adlari career'da gelmiyor; lig basina seasons listesinden cozulur.
    // "Super Lig 26/27" gibi isim yerine takvim etiketi uretilir: 2026/27 ya da
    // takvim yili liglerinde duz 2026.
    const seasonInfo=new Map<number,{label:string|null;isCurrent:boolean|null}>();
    await Promise.all(leagueIds.map(async lid=>{try{
      const body=await api(`/leagues/${lid}/seasons/`,key);
      const rows=(Array.isArray(body)?body:Array.isArray(body?.results)?body.results:Array.isArray(body?.seasons)?body.seasons:[]).map(object);
      for(const s of rows){const sid=number(s.id);if(sid===null)continue;
        const startYear=(()=>{const d=text(s.start_date);return d?Number(d.slice(0,4)):number(s.year)})();
        const endYear=(()=>{const d=text(s.end_date);return d?Number(d.slice(0,4)):null})();
        const label=startYear!==null?(endYear!==null&&endYear>startYear?`${startYear}/${String(endYear).slice(-2)}`:String(startYear)):null;
        seasonInfo.set(sid,{label,isCurrent:typeof s.is_current==='boolean'?s.is_current:null});}
    }catch{/* lig icin sezon listesi yoksa etiket bos kalir */}}));
    const latestSeason=new Map<number,number>();for(const s of seasons){const lid=number(s.league_id),sid=number(s.season_id);if(lid===null||sid===null)continue;if((latestSeason.get(lid)??-Infinity)<sid)latestSeason.set(lid,sid)}
    return json({available:true,profile:{id:String(pid??playerId),name:text(p.name)??'',shortName:text(p.short_name),position:text(p.position),specificPosition:text(p.specific_position),jerseyNumber:number(p.jersey_number),dateOfBirth:text(p.date_of_birth),heightCm:number(p.height_cm),weightKg:number(p.weight_kg),preferredFoot:text(p.preferred_foot),nationality:text(p.nationality),teamId:currentTeamId!==null?String(currentTeamId):null,teamName:currentTeam.name??text(object(p.current_team).name),teamLogoUrl:currentTeam.logo,nationalTeamId:nationalTeamId!==null?String(nationalTeamId):null,nationalTeamName:resolveTeam(nationalTeamId).name??text(object(p.national_team).name),marketValueEur:number(p.market_value_eur),contractUntil:text(p.contract_until),availability:text(p.availability),injuryType:text(p.injury_type)||null,injuryExpectedReturn:text(p.injury_expected_return),rating:number(p.rating),photoUrl:pid!==null?photo(pid):null},
      seasons:seasons.map(s=>{const lid=number(s.league_id),sid=number(s.season_id),tid=number(s.team_id);const team=resolveTeam(tid);const info=sid!==null?seasonInfo.get(sid):undefined;return{seasonId:sid,leagueId:lid,seasonLabel:info?.label??null,leagueName:lid!==null?(leagueName.get(lid)??KNOWN_LEAGUES[lid]??null):null,teamId:tid!==null?String(tid):null,teamName:team.name,teamLogoUrl:team.logo,matches:number(s.matches),minutes:number(s.minutes),goals:number(s.goals),assists:number(s.assists),avgRating:number(s.avg_rating),isCurrent:info?.isCurrent??(lid!==null&&sid!==null&&latestSeason.get(lid)===sid)}}).filter(s=>s.leagueId!==null).sort((a,b)=>(b.seasonId??0)-(a.seasonId??0))});
  }catch(caught){return json({available:false,reason:caught instanceof Error?caught.message:'unknown'})}
});
