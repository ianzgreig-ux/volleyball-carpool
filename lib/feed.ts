import {env} from 'cloudflare:workers';import {parseCalendar} from './calendar';

class FeedSyncError extends Error {}

const legacy:Record<string,string>={'3584682':'01','3584234':'03','3584235':'05','3584683':'07','3584684':'08','3584236':'10','3584237':'12','3584685':'14','3584686':'15','3584238':'17','3584239':'19','3584687':'21'};
export async function syncFeed(){const db=env.DB;let state=await db.prepare('SELECT synced_at FROM feed_state WHERE id=1').first<{synced_at:string}>();let warning='';if(!state||Date.now()-Date.parse(state.synced_at)>86400000){try{
const configuredUrl=(env as unknown as {SPROCKET_FEED_URL?:string}).SPROCKET_FEED_URL?.trim();
if(!configuredUrl)throw new FeedSyncError('The Sprocket calendar link is missing from the app settings.');
let feedUrl:URL;try{feedUrl=new URL(configuredUrl);}catch{throw new FeedSyncError('The Sprocket calendar link in the app settings is not a valid URL.');}
if(!['https:','http:'].includes(feedUrl.protocol))throw new FeedSyncError('The Sprocket calendar link must use an HTTPS or HTTP address.');
let res:Response;try{res=await fetch(feedUrl.toString(),{signal:AbortSignal.timeout(12000)});}catch(error){throw new FeedSyncError(error instanceof Error&&['TimeoutError','AbortError'].includes(error.name)?'Sprocket took too long to respond.':'The app could not connect to Sprocket.');}
if(!res.ok)throw new FeedSyncError('Sprocket returned HTTP '+res.status+'.');
const raw=await res.text();if(!raw.includes('BEGIN:VCALENDAR'))throw new FeedSyncError('Sprocket returned a page instead of a calendar feed.');
let events:ReturnType<typeof parseCalendar>;try{events=parseCalendar(raw);}catch{throw new FeedSyncError('The Sprocket calendar could not be read.');}
if(!events.length)throw new FeedSyncError('The Sprocket feed contains no matching Bears or ALL practices.');
const queries=events.map(e=>db.prepare('INSERT INTO practices (id,key,date,start,end,title,location,status) VALUES (?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET date=excluded.date,start=excluded.start,end=excluded.end,title=excluded.title,location=excluded.location,status=excluded.status').bind(e.id,legacy[e.id.replace('SprocketSports-','')]?'2026-11-'+legacy[e.id.replace('SprocketSports-','')]:e.id,e.date,e.start,e.end,e.title,e.location,e.status));const ids=events.map(e=>e.id);queries.push(db.prepare("UPDATE practices SET status='removed' WHERE id NOT IN ("+ids.map(()=>'?').join(',')+')').bind(...ids));const now=new Date().toISOString();queries.push(db.prepare('INSERT INTO feed_state (id,synced_at) VALUES (1,?) ON CONFLICT(id) DO UPDATE SET synced_at=excluded.synced_at').bind(now));try{await db.batch(queries);}catch{throw new FeedSyncError('The calendar was downloaded, but the app could not save the updated schedule.');}state={synced_at:now};}catch(error){warning=(error instanceof FeedSyncError?error.message:'The schedule refresh failed unexpectedly.')+' Showing the last saved schedule.';}}const result=await db.prepare('SELECT * FROM practices ORDER BY date,start').all();return {events:result.results,syncedAt:state?.synced_at||null,warning};}
