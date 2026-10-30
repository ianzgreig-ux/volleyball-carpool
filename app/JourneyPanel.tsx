"use client";
import {useEffect,useRef,useState} from 'react';
import {chicagoDate,clockTime,etaText,journeyLabel,journeyMessage} from '../lib/journey';
import type {JourneyDirection,JourneyFamily,JourneyPractice,JourneyStatus,JourneyUpdate} from '../lib/journey';

export function JourneySummary({update,direction}:{update?:JourneyUpdate;direction:JourneyDirection}) {
  return <div className="journey-summary">
    {update?.pickupTime&&<p><strong>{direction==='there'?'Home pickup':'Pickup'}: {clockTime(update.pickupTime)}</strong></p>}
    {update?.pickupLocation&&<p>{update.pickupLocation}</p>}
    {update?.note&&<p>{update.note}</p>}
    {update&&update.status!=='scheduled'&&<p className={'journey-status '+update.status}><strong>{journeyLabel(update.status,direction)}</strong>{update.status==='on_my_way'&&<span>{etaText(update)}</span>}<small>Updated {new Date(update.statusAt!).toLocaleTimeString('en-US',{timeZone:'America/Chicago',hour:'numeric',minute:'2-digit'})} Chicago time</small></p>}
  </div>;
}

type Props={practice:JourneyPractice;direction:JourneyDirection;family:JourneyFamily;update?:JourneyUpdate;available:boolean;onSave:(body:unknown)=>Promise<unknown>;onClose:()=>void};
export default function JourneyPanel({practice,direction,family,update,available,onSave,onClose}:Props) {
  const dialog=useRef<HTMLDialogElement>(null);
  const [pickupTime,setPickupTime]=useState(update?.pickupTime||''),[pickupLocation,setPickupLocation]=useState(update?.pickupLocation||''),[note,setNote]=useState(update?.note||'');
  const [eta,setEta]=useState(10),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
  const originalFamily=useRef(family.id);
  const driverChanged=family.id!==originalFamily.current;
  const canEdit=available&&!driverChanged&&practice.status==='active'&&practice.date>=chicagoDate();
  const live=canEdit&&practice.date===chicagoDate();
  useEffect(()=>{const previous=document.activeElement as HTMLElement|null;dialog.current?.showModal();return()=>{previous?.focus();}},[]);
  const message=journeyMessage(practice,direction,family,update);
  async function save(body:Record<string,unknown>,success:string) {
    setBusy(true);setError('');setNotice('');
    try{await onSave({...body,date:practice.key,direction,family:originalFamily.current});setNotice(success);}catch(e){setError(e instanceof Error?e.message:'Could not save this trip update.');}finally{setBusy(false);}
  }
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
    <p className="journey-help">Only update the status if you’re driving this trip. Updates are shared with all families.</p>
    {driverChanged&&<p className="error" role="alert">The driver has changed. Close this panel and check the new assignment.</p>}
    {!available&&<p className="error">No ride is currently needed for this trip.</p>}
    <section className="journey-live" aria-labelledby="trip-status-heading">
      <h3 id="trip-status-heading">Trip status</h3>
      <JourneySummary update={update?{...update,pickupTime:'',pickupLocation:'',note:''}:undefined} direction={direction}/>
      {(!update||update.status==='scheduled')&&<p className="journey-help">Scheduled</p>}
      <fieldset disabled={busy||!live} className="eta-options"><legend>How long until pickup?</legend>{[5,10,15].map(minutes=><label key={minutes}><input type="radio" name="eta" checked={eta===minutes} onChange={()=>setEta(minutes)}/>{minutes} min</label>)}</fieldset>
      <div className="journey-actions"><button className="journey-primary" type="button" disabled={busy||!live} onClick={()=>status('on_my_way')}>{update?.status==='on_my_way'?'Update arrival estimate':'On my way'}</button><button type="button" disabled={busy||!live||update?.status==='arrived'} onClick={()=>status('arrived')}>Arrived at pickup</button><button type="button" disabled={busy||!live||update?.status==='completed'} onClick={()=>status('completed')}>{direction==='there'?'Dropped off at practice':'Dropped off at home'}</button></div>
      {update&&update.status!=='scheduled'&&<button type="button" className="journey-reset" disabled={busy||!live} onClick={()=>status('scheduled')}>Reset to scheduled</button>}
      {!live&&canEdit&&<p className="journey-help">Live status buttons are available on the practice day. You can save pickup details now.</p>}
    </section>
    {error&&<p className="error" role="alert">{error}</p>}{notice&&<p className="journey-notice" role="status">{notice}</p>}
    <section className="journey-share" aria-labelledby="trip-message-heading"><h3 id="trip-message-heading">Message the group</h3><p className="journey-help">Uses the saved trip details. Choose your existing group in your phone’s share menu, then send. Nothing is sent automatically.</p><button className="journey-primary" type="button" disabled={busy||!canEdit} onClick={share}>Share / text the group</button><details className="message-preview"><summary>Preview message</summary><textarea aria-label="Prepared group text" readOnly value={message} rows={5}/></details></section>
    <form className="journey-plan" onSubmit={e=>{e.preventDefault();const fields=new FormData(e.currentTarget);void save({type:'journey_details',pickupTime:String(fields.get('pickupTime')||''),pickupLocation:String(fields.get('pickupLocation')||''),note:String(fields.get('note')||'')},'Pickup details saved.');}}>
      <h3>Pickup plan</h3>
      <p className="journey-help">Practice {direction==='there'?'starts':'finishes'} at {clockTime((direction==='there'?practice.start:practice.end).slice(11,16))}. All times are Chicago time.</p>
      <label>{direction==='there'?'Collect kids from home at':'Collect kids from practice at'}<input type="time" name="pickupTime" value={pickupTime} onInput={e=>setPickupTime(e.currentTarget.value)} disabled={busy||!canEdit} max={direction==='there'?practice.start.slice(11,16):undefined} min={direction==='back'?practice.end.slice(11,16):undefined} onChange={e=>setPickupTime(e.target.value)}/></label>
      <label>Meeting place<input name="pickupLocation" value={pickupLocation} disabled={busy||!canEdit} maxLength={160} placeholder={direction==='there'?'e.g. Front entrance':'e.g. Outside the gym'} onChange={e=>setPickupLocation(e.target.value)}/></label>
      <label>Pickup note<textarea name="note" value={note} disabled={busy||!canEdit} maxLength={300} rows={2} placeholder="e.g. Meet downstairs. Picking up Eve first." onChange={e=>setNote(e.target.value)}/></label>
      <button className="journey-primary" disabled={busy||!canEdit} type="submit">{busy?'Saving…':'Save pickup details'}</button>
    </form>

  </dialog>;
}
