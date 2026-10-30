export type JourneyDirection = 'there' | 'back';
export type JourneyStatus = 'scheduled' | 'on_my_way' | 'arrived' | 'completed';
export type JourneyUpdate = {
  date: string; direction: JourneyDirection; family: number;
  pickupTime: string; pickupLocation: string; note: string; pickupOrder?: number[];
  status: JourneyStatus; etaMinutes: number | null; statusAt: string | null; updatedAt: string;
};
export type JourneyPractice = {key:string;date:string;start:string;end:string;location:string;status:string};
export type JourneyFamily = {id:number;child:string;parent:string};
export function orderedRiders(riders:JourneyFamily[], driverId:number, saved:number[] = []) {
  const eligible=riders.filter(r=>r.id!==driverId);
  const ids=[...new Set([...saved,...eligible.map(r=>r.id)])];
  return ids.map(id=>eligible.find(r=>r.id===id)).filter((r):r is JourneyFamily=>!!r);
}
export function pickupOrderText(riders:JourneyFamily[]) {
  return riders.map((r,i)=>`${i+1}. ${r.child}${i?` (+${i*5} min after first pickup)`:' (first)'}`).join('\n');
}
export function chicagoDate(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA',{timeZone:'America/Chicago',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
}
export function clockTime(value:string) {
  const [h,m]=value.split(':').map(Number);
  return `${h%12||12}:${String(m).padStart(2,'0')} ${h>=12?'PM':'AM'}`;
}
export function journeyLabel(status:JourneyStatus, direction:JourneyDirection) {
  return status==='on_my_way'?'On my way':status==='arrived'?'Arrived at pickup':status==='completed'?(direction==='there'?'Dropped off at practice':'Dropped off at home'):'Scheduled';
}
export function etaText(update:JourneyUpdate, now=Date.now()) {
  if(update.status!=='on_my_way'||!update.statusAt||!update.etaMinutes)return '';
  const remaining=Math.ceil((Date.parse(update.statusAt)+update.etaMinutes*60000-now)/60000);
  return remaining>0?`About ${remaining} min to pickup`:'ETA has passed. Check with the driver.';
}
export function journeyMessage(practice:JourneyPractice,direction:JourneyDirection,family:JourneyFamily,update:JourneyUpdate|undefined,now=Date.now(),riders:JourneyFamily[]=[]) {
  const driver=family.parent||`${family.child}’s parent`;
  const day=new Date(practice.date+'T12:00:00').toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'});
  const lines=[`Volleyball ${direction==='there'?'trip to practice':'trip home'} · ${day}`,`Driver: ${driver}.`];
  if(update?.status==='on_my_way')lines.push(`${driver} is on the way. ${etaText(update,now).replace(/\.$/,'')}.`);
  else if(update?.status==='arrived')lines.push(`${driver} has arrived ${direction==='there'?'to collect the kids':'at practice for pickup'}.`);
  else if(update?.status==='completed')lines.push(direction==='there'?'The kids have been dropped off at practice.':'The kids have been dropped off at home.');
  if(direction==='there') {
    const ordered=orderedRiders(riders,family.id,update?.pickupOrder);
    if(ordered.length)lines.push('Pickup order (about 5 minutes between kids):',pickupOrderText(ordered));
  }
  lines.push(`Practice: ${clockTime(practice.start.slice(11,16))} to ${clockTime(practice.end.slice(11,16))} at ${practice.location.split('\n')[0]}.`);
  if(update?.statusAt)lines.push(`Status updated ${new Date(update.statusAt).toLocaleTimeString('en-US',{timeZone:'America/Chicago',hour:'numeric',minute:'2-digit'})} Chicago time.`);
  return lines.join('\n');
}
