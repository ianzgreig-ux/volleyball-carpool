"use client";
import {useEffect,useRef,useState} from 'react';
import {chicagoDate,etaText,journeyLabel,journeyMessage,orderedRiders} from '../lib/journey';
import type {JourneyDirection,JourneyFamily,JourneyPractice,JourneyStatus,JourneyUpdate} from '../lib/journey';

export function JourneySummary({update,direction,riders=[],driverId=0}:{update?:JourneyUpdate;direction:JourneyDirection;riders?:JourneyFamily[];driverId?:number}) {
  const ordered=direction==='there'?orderedRiders(riders,driverId,update?.pickupOrder):[];
  return <div className="journey-summary">
    {ordered.length>0&&<p>Collect: {ordered.map(r=>r.child).join(' → ')}<small>About 5 min between kids</small></p>}
    {update&&update.status!=='scheduled'&&<p className={'journey-status '+update.status}><strong>{journeyLabel(update.status,direction)}</strong>{update.status==='on_my_way'&&<span>{etaText(update)}</span>}<small>Updated {new Date(update.statusAt!).toLocaleTimeString('en-US',{timeZone:'America/Chicago',hour:'numeric',minute:'2-digit'})} Chicago time</small></p>}
  </div>;
}

type Props={practice:JourneyPractice;direction:JourneyDirection;family:JourneyFamily;riders:JourneyFamily[];update?:JourneyUpdate;available:boolean;onSave:(body:unknown)=>Promise<unknown>;onClose:()=>void};
export default function JourneyPanel({practice,direction,family,riders,update,available,onSave,onClose}:Props) {
  const dialog=useRef<HTMLDialogElement>(null);
  const [draftOrder,setDraftOrder]=useState<number[]|null>(null);
  const [eta,setEta]=useState(5),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
  const originalFamily=useRef(family.id);
  const driverChanged=family.id!==originalFamily.current;
  const canEdit=available&&!driverChanged&&practice.status==='active'&&practice.date>=chicagoDate();
  const live=canEdit&&practice.date===chicagoDate();
  const savedOrder=orderedRiders(riders,family.id,update?.pickupOrder);
  const order=orderedRiders(riders,family.id,draftOrder||update?.pickupOrder);
  const dirty=direction==='there'&&order.map(r=>r.id).join(',')!==savedOrder.map(r=>r.id).join(',');
  useEffect(()=>{const previous=document.activeElement as HTMLElement|null;dialog.current?.showModal();return()=>{previous?.focus();}},[]);
  const message=journeyMessage(practice,direction,family,update,Date.now(),riders);
  async function save(body:Record<string,unknown>,success:string) {
    setBusy(true);setError('');setNotice('');
    try{await onSave({...body,date:practice.key,direction,family:originalFamily.current});setNotice(success);return true;}catch(e){setError(e instanceof Error?e.message:'Could not save this trip update.');return false;}finally{setBusy(false);}
  }
  async function saveOrder(){if(await save({type:'journey_order',pickupOrder:order.map(r=>r.id)},'Order saved.'))setDraftOrder(null);}
  function move(index:number,step:number){const ids=order.map(r=>r.id);[ids[index],ids[index+step]]=[ids[index+step],ids[index]];setDraftOrder(ids);setNotice('');}
  function status(value:JourneyStatus){return save({type:'journey_status',status:value,etaMinutes:value==='on_my_way'?eta:null},'Status saved. Share a text to alert the group.');}
  async function share(){
    setError('');setNotice('');
    if(navigator.share){try{await navigator.share({text:message});return;}catch(e){if(e instanceof Error&&e.name==='AbortError')return;}}
    try{await navigator.clipboard.writeText(message);setNotice('Message copied. Paste it into your existing group text.');}catch{setNotice('Open Preview message, select and copy the text, then paste it into your group text.');}
  }
  return <dialog ref={dialog} className="journey-dialog" aria-labelledby="journey-title" onCancel={e=>{e.preventDefault();if(!busy)onClose();}}>
    <button className="close" type="button" aria-label="Close trip panel" disabled={busy} onClick={onClose}>×</button>
    <div className="eyebrow">{new Date(practice.date+'T12:00:00').toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'})}</div>
    <h2 id="journey-title">{direction==='there'?'Taking the kids to practice':'Bringing the kids home'}</h2>
    <p className="journey-driver">Driver: <strong>{family.parent||family.child+'’s parent'}</strong></p>
    {driverChanged&&<p className="error" role="alert">The driver has changed. Close this panel and check the new assignment.</p>}
    {!available&&<p className="error">No ride is currently needed for this trip.</p>}
    {direction==='there'&&<section className="journey-plan" aria-labelledby="pickup-order-heading">
      <h3 id="pickup-order-heading">Who’s first?</h3>
      <p className="journey-help">Use the arrows to change the order. Allow about 5 minutes between kids.</p>
      <ol className="pickup-order">{order.map((r,i)=><li key={r.id}><span className="pickup-number">{i+1}</span><div><strong>{r.child}</strong><small>{i?`About ${i*5} min after first pickup`:'First pickup'}</small></div><button type="button" aria-label={'Move '+r.child+' earlier'} disabled={busy||!canEdit||i===0} onClick={()=>move(i,-1)}>↑</button><button type="button" aria-label={'Move '+r.child+' later'} disabled={busy||!canEdit||i===order.length-1} onClick={()=>move(i,1)}>↓</button></li>)}</ol>
      {!order.length&&<p className="journey-help">No other kids to collect.</p>}
      {riders.some(r=>r.id===family.id)&&<p className="journey-help">{family.child} is already with the driver.</p>}
      {dirty&&<button className="journey-primary" disabled={busy||!canEdit} type="button" onClick={saveOrder}>{busy?'Saving…':'Save order'}</button>}
    </section>}
    {live&&<section className="journey-live" aria-labelledby="trip-status-heading">
      <h3 id="trip-status-heading">Trip status</h3>
      <JourneySummary update={update} direction={direction}/>
      <fieldset disabled={busy||dirty} className="eta-options"><legend>{direction==='there'?'Time to first child':'Time to practice pickup'}</legend>{[5,10,15].map(minutes=><label key={minutes}><input type="radio" name="eta" checked={eta===minutes} onChange={()=>setEta(minutes)}/>{minutes} min</label>)}</fieldset>
      <div className="journey-actions"><button className="journey-primary" type="button" disabled={busy||dirty} onClick={()=>status('on_my_way')}>{update?.status==='on_my_way'?'Update arrival estimate':'On my way'}</button><button type="button" disabled={busy||dirty||update?.status==='arrived'} onClick={()=>status('arrived')}>Arrived at pickup</button><button type="button" disabled={busy||dirty||update?.status==='completed'} onClick={()=>status('completed')}>{direction==='there'?'Dropped off at practice':'Dropped off at home'}</button></div>
      {update&&update.status!=='scheduled'&&<button type="button" className="journey-reset" disabled={busy||dirty} onClick={()=>status('scheduled')}>Reset to scheduled</button>}
    </section>}
    {!live&&canEdit&&<p className="journey-help">“On my way” will be available on the practice day.</p>}
    {dirty&&<p className="journey-help">Save the order before updating your status or sharing.</p>}
    {error&&<p className="error" role="alert">{error}</p>}{notice&&<p className="journey-notice" role="status">{notice}</p>}
    <section className="journey-share" aria-labelledby="trip-message-heading"><h3 id="trip-message-heading">Message the group</h3><p className="journey-help">Choose your group and tap Send in your messaging app.</p><button className="journey-primary" type="button" disabled={busy||!canEdit||dirty} onClick={share}>Share / text the group</button><details className="message-preview"><summary>Preview message</summary><textarea aria-label="Prepared group text" readOnly value={message} rows={5}/></details></section>
  </dialog>;
}
