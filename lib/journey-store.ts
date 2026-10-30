import type {JourneyUpdate} from './journey';

// Additive and idempotent, including deployments which do not run migrations first.
export const rideUpdatesSQL = `CREATE TABLE IF NOT EXISTS ride_updates (
  date TEXT NOT NULL, direction TEXT NOT NULL CHECK(direction IN ('there','back')),
  family INTEGER NOT NULL, pickup_time TEXT NOT NULL DEFAULT '',
  pickup_location TEXT NOT NULL DEFAULT '', note TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK(status IN ('scheduled','on_my_way','arrived','completed')),
  eta_minutes INTEGER, status_at TEXT, updated_at TEXT NOT NULL,
  PRIMARY KEY(date,direction)
)`;
const ready=new WeakMap<D1Database,Promise<unknown>>();
export async function ensureRideUpdates(db:D1Database) {
  if(!ready.has(db))ready.set(db,db.prepare(rideUpdatesSQL).run().catch(error=>{ready.delete(db);throw error;}));
  await ready.get(db);
}
export async function listJourneyUpdates(db:D1Database) {
  await ensureRideUpdates(db);
  const rows=await db.prepare(`SELECT r.date,r.direction,r.family,r.pickup_time AS pickupTime,
    r.pickup_location AS pickupLocation,r.note,r.status,r.eta_minutes AS etaMinutes,
    r.status_at AS statusAt,r.updated_at AS updatedAt FROM ride_updates r
    JOIN assignments a ON a.date=r.date AND a.direction=r.direction AND a.family=r.family`).all<JourneyUpdate>();
  return rows.results;
}
export async function saveJourneyUpdate(db:D1Database,input:any,now=new Date()) {
  const bad=(error:string,status=400)=>Response.json({error},{status});
  if(!input||!['journey_details','journey_status'].includes(input.type)||typeof input.date!=='string'||!input.date||input.date.length>100||!['there','back'].includes(input.direction)||!Number.isInteger(input.family)||input.family<1||input.family>4)return bad('Invalid trip update.');
  const today=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Chicago',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
  const practice=await db.prepare("SELECT date,start,end FROM practices WHERE key=? AND status='active'").bind(input.date).first<{date:string;start:string;end:string}>();
  if(!practice||practice.date<today)return bad('This practice is no longer available for updates.');
  const assignment=await db.prepare('SELECT family FROM assignments WHERE date=? AND direction=?').bind(input.date,input.direction).first<{family:number}>();
  if(assignment?.family!==input.family)return bad('The driver has changed. Close this panel and check the schedule.',409);
  const attending=await db.prepare('SELECT COUNT(*) AS n FROM families f WHERE NOT EXISTS (SELECT 1 FROM absences x WHERE x.date=? AND x.family=f.id)').bind(input.date).first<{n:number}>();
  if(!attending?.n)return bad('No players are attending, so no ride is needed.');
  if(input.type==='journey_details') {
    if(typeof input.pickupTime!=='string'||(input.pickupTime!==''&&!/^([01]\d|2[0-3]):[0-5]\d$/.test(input.pickupTime))||typeof input.pickupLocation!=='string'||input.pickupLocation.length>160||typeof input.note!=='string'||input.note.length>300)return bad('Enter a valid pickup time, location (160 characters) and note (300 characters).');
    if(input.pickupTime&&input.direction==='there'&&input.pickupTime>practice.start.slice(11,16))return bad('Home pickup must be at or before practice starts.');
    if(input.pickupTime&&input.direction==='back'&&input.pickupTime<practice.end.slice(11,16))return bad('Return pickup must be at or after practice finishes.');
  } else {
    if(practice.date!==today)return bad('Live status updates are available on the practice day.');
    if(!['scheduled','on_my_way','arrived','completed'].includes(input.status))return bad('Choose a valid trip status.');
    if(input.status==='on_my_way'&&![5,10,15].includes(input.etaMinutes))return bad('Choose an arrival estimate of 5, 10 or 15 minutes.');
  }
  await ensureRideUpdates(db);
  const stamp=now.toISOString();
  // Check the assignment again inside the atomic write, to reject a stale driver.
  const gate='EXISTS (SELECT 1 FROM assignments WHERE date=? AND direction=? AND family=?)';
  const detail=input.type==='journey_details';
  const mutation=detail?db.prepare(`INSERT INTO ride_updates (date,direction,family,pickup_time,pickup_location,note,updated_at)
    SELECT ?,?,?,?,?,?,? WHERE ${gate} ON CONFLICT(date,direction) DO UPDATE SET
    pickup_time=excluded.pickup_time,pickup_location=excluded.pickup_location,note=excluded.note,
    status=CASE WHEN ride_updates.family=excluded.family THEN ride_updates.status ELSE 'scheduled' END,
    eta_minutes=CASE WHEN ride_updates.family=excluded.family THEN ride_updates.eta_minutes ELSE NULL END,
    status_at=CASE WHEN ride_updates.family=excluded.family THEN ride_updates.status_at ELSE NULL END,
    family=excluded.family,updated_at=excluded.updated_at`).bind(input.date,input.direction,input.family,input.pickupTime,input.pickupLocation.trim(),input.note.trim(),stamp,input.date,input.direction,input.family)
    :db.prepare(`INSERT INTO ride_updates (date,direction,family,status,eta_minutes,status_at,updated_at)
    SELECT ?,?,?,?,?,?,? WHERE ${gate} ON CONFLICT(date,direction) DO UPDATE SET
    family=excluded.family,status=excluded.status,eta_minutes=excluded.eta_minutes,status_at=excluded.status_at,updated_at=excluded.updated_at`).bind(input.date,input.direction,input.family,input.status,input.status==='on_my_way'?input.etaMinutes:null,input.status==='scheduled'?null:stamp,stamp,input.date,input.direction,input.family);
  const description=detail?'Pickup details updated':input.status==='on_my_way'?`On my way · ${input.etaMinutes} min`:input.status==='arrived'?'Arrived at pickup':input.status==='completed'?'Dropped off':'Scheduled';
  const log=db.prepare(`INSERT INTO changes (id,date,direction,previous,next,changed_at)
    SELECT ?,?,?,COALESCE((SELECT status FROM ride_updates WHERE date=? AND direction=?),'scheduled'),?,? WHERE ${gate}`).bind(crypto.randomUUID(),input.date,'journey_'+input.direction,input.date,input.direction,description,stamp,input.date,input.direction,input.family);
  const results=await db.batch([log,mutation]);
  if(!results[1].meta.changes)return bad('The driver has changed. Refresh the schedule.',409);
  return Response.json({ok:true});
}
