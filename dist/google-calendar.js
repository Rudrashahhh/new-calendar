/* Google data is held in memory. OAuth tokens never enter browser storage or backups. */
(function(root){
 'use strict';
 const SCOPE='https://www.googleapis.com/auth/calendar.readonly';
 const API='https://www.googleapis.com/calendar/v3/';
 function dayKey(d){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
 function normalizeEvent(raw,calendar){
  if(!raw||raw.status==='cancelled'||!raw.id||!raw.start||!raw.end)return null;
  const allDay=!!raw.start.date;
  const start=allDay?raw.start.date:raw.start.dateTime,end=allDay?raw.end.date:raw.end.dateTime;
  if(!start||!end||Number.isNaN(new Date(start).getTime())||Number.isNaN(new Date(end).getTime()))return null;
  const startDate=allDay?start:dayKey(new Date(start));
  return {id:`google:${calendar.id}:${raw.id}`,source:'google',title:raw.summary||'Busy',start,end,allDay,date:startDate,time:allDay?'00:00':new Date(start).toTimeString().slice(0,5),calendar:calendar.summaryOverride||calendar.summary||'Google Calendar',calendarId:calendar.id,space:/finance|investment/i.test([calendar.summaryOverride,calendar.summary,raw.summary].join(' '))?'Finance Society':'Personal',note:raw.location||'',link:typeof raw.htmlLink==='string'&&raw.htmlLink.startsWith('https://calendar.google.com/')?raw.htmlLink:'https://calendar.google.com/calendar/u/0/r'};
 }
 function occursOn(event,date){
  if(event.allDay)return event.start<=date&&date<event.end;
  const min=new Date(date+'T00:00:00'),max=new Date(min);max.setDate(max.getDate()+1);
  return new Date(event.start)<max&&new Date(event.end)>min;
 }
 function windows(month,selected,today){
  const first=new Date(month.getFullYear(),month.getMonth(),1);first.setDate(1-((first.getDay()+6)%7));
  const end=new Date(first);end.setDate(end.getDate()+42);
  const ranges=[{start:first,end}];
  for(const key of [selected,today]){const start=new Date(key+'T00:00:00'),end=new Date(start);end.setDate(end.getDate()+1);ranges.push({start,end})}
  ranges.sort((a,b)=>a.start-b.start);return ranges.reduce((all,r)=>{const last=all.at(-1);if(last&&r.start<=last.end){if(r.end>last.end)last.end=r.end}else all.push(r);return all},[]).map(r=>({timeMin:r.start.toISOString(),timeMax:r.end.toISOString()}));
 }
 class CalendarConnection {
  constructor({clientId,onChange,fetchImpl=globalThis.fetch}){this.clientId=clientId;this.onChange=onChange;this.fetchImpl=fetchImpl;this.token=null;this.expiry=0;this.calendars=[];this.events=[];this.status='disconnected';this.message='Connect to see your live events.';this.lastSync=null;this.generation=0;this.controller=null;this.selection=new Set();this.initialized=false;this.cachedSignature='';}
  notify(){this.onChange?.(this)}
  connected(){return !!this.token&&Date.now()<this.expiry}
  connect(){
   if(!this.clientId){this.status='setup';this.message='Google Calendar setup is still being completed.';this.notify();return}
   const oauth=root.google?.accounts?.oauth2;
   if(!oauth){this.status='error';this.message='Google sign-in could not load. Check your connection and try again.';this.notify();return}
   this.status='authorizing';this.message='Choose your Google account to continue.';this.notify();
   try {const client=oauth.initTokenClient({client_id:this.clientId,scope:SCOPE,include_granted_scopes:false,
    callback:async response=>{if(response.error||!response.access_token||!Number.isFinite(Number(response.expires_in))||Number(response.expires_in)<=30||!oauth.hasGrantedAllScopes(response,SCOPE)){this.status='error';this.message='Calendar access was not granted. You can try connecting again.';this.notify();return}this.controller?.abort();this.generation++;this.token=response.access_token;this.expiry=Date.now()+Math.max(0,Number(response.expires_in)*1000-30000);this.events=[];this.calendars=[];this.selection.clear();this.initialized=false;this.cachedSignature='';this.lastSync=null;this.status='connected';this.message='Loading your calendars…';this.notify();},
    error_callback:error=>{this.status='error';this.message=error.type==='popup_failed_to_open'?'Allow the Google sign-in popup, then try again.':'Google sign-in was closed. Connect when you’re ready.';this.notify();}
   });client.requestAccessToken({prompt:'select_account'});}catch{this.status='error';this.message='Google sign-in could not start. Please try again.';this.notify()}
  }
  disconnect(){this.controller?.abort();this.generation++;this.token=null;this.expiry=0;this.events=[];this.calendars=[];this.selection.clear();this.initialized=false;this.cachedSignature='';this.lastSync=null;this.status='disconnected';this.message='Disconnected. Your local plans and tasks are still here.';this.notify()}
  async get(path,query,signal){
   if(!this.connected()){const error=new Error('Reconnect to Google to refresh your events.');error.status=401;throw error}
   const url=new URL(path,API);for(const [k,v]of Object.entries(query||{}))if(v!==undefined&&v!==null)url.searchParams.set(k,v);
   const requestController=new AbortController();const abort=()=>requestController.abort();signal?.addEventListener('abort',abort,{once:true});if(signal?.aborted)abort();let timedOut=false;const timeout=setTimeout(()=>{timedOut=true;requestController.abort()},20000);let response;
   try{response=await this.fetchImpl(url.href,{headers:{Authorization:`Bearer ${this.token}`},signal:requestController.signal,cache:'no-store'});}catch(error){if(timedOut)throw new Error('Google Calendar took too long to respond. Please try refreshing again.');throw error;}finally{clearTimeout(timeout);signal?.removeEventListener('abort',abort);}
   const data=await response.json().catch(()=>null);
   if(!response.ok){const error=new Error(response.status===401?'Reconnect to Google to refresh your events.':response.status===403?'Google denied calendar access. Check the Calendar API and your permission.':response.status===429?'Google is receiving too many requests. Wait a moment before refreshing.':'Google Calendar couldn’t refresh. Your last loaded events are still shown.');error.status=response.status;throw error}
   if(!data||!Array.isArray(data.items))throw new Error('Google Calendar returned an unexpected response.');return data;
  }
  async paged(path,query,signal,maxPages=20){let items=[],pageToken;for(let page=0;page<maxPages;page++){const data=await this.get(path,{...query,pageToken},signal);items.push(...data.items);pageToken=data.nextPageToken;if(!pageToken)return items}throw new Error('There are too many events in this view. Try a smaller calendar selection.')}
  async refresh(ranges,force=false){
   const signature=JSON.stringify(ranges)+'|'+[...this.selection].sort().join('|');
   if(!force&&signature===this.cachedSignature)return;
   if(!this.connected()){if(this.lastSync){this.status='expired';this.message='Reconnect to refresh. Showing your last loaded events.';this.notify()}return}
   const gen=++this.generation;this.controller?.abort();this.controller=new AbortController();const {signal}=this.controller;
   this.status='loading';this.message='Refreshing Google Calendar…';this.notify();
   try{
    if(!this.initialized){const calendars=await this.paged('users/me/calendarList',{maxResults:250,minAccessRole:'reader'},signal);if(gen!==this.generation)return;this.calendars=calendars.filter(x=>x.id&&!x.deleted);this.selection=new Set(this.calendars.filter(x=>x.selected!==false).map(x=>x.id));if(!this.selection.size&&this.calendars.length)this.selection.add(this.calendars.find(x=>x.primary)?.id||this.calendars[0].id);this.initialized=true;}
    const calendars=this.calendars.filter(x=>this.selection.has(x.id));
    const eventMap=new Map(),failures=[];
    // Batch calendars to keep request volume bounded.
    for(let i=0;i<calendars.length;i+=4){const batch=await Promise.allSettled(calendars.slice(i,i+4).map(async calendar=>{const items=[];for(const range of ranges){items.push(...await this.paged(`calendars/${encodeURIComponent(calendar.id)}/events`,{...range,maxResults:2500,singleEvents:true,orderBy:'startTime',showDeleted:false,timeZone:Intl.DateTimeFormat().resolvedOptions().timeZone},signal));}return {calendar,items}}));if(gen!==this.generation)return;for(let n=0;n<batch.length;n++){const item=batch[n],calendar=calendars[i+n];if(item.status==='fulfilled'){for(const raw of item.value.items){const event=normalizeEvent(raw,item.value.calendar);if(event)eventMap.set(event.id,event)}}else {if(item.reason?.name==='AbortError')return;failures.push(item.reason);for(const old of this.events.filter(x=>x.calendarId===calendar.id))eventMap.set(old.id,old)}}}
    if(gen!==this.generation)return;this.events=[...eventMap.values()];
    if(failures.length){this.status=failures.some(x=>x.status===401)?'expired':'stale';this.message=failures[0].message;this.cachedSignature='';}else{this.status='connected';this.lastSync=new Date();this.message=calendars.length?`Updated ${this.lastSync.toLocaleTimeString(undefined,{hour:'numeric',minute:'2-digit'})} · ${calendars.length} calendar${calendars.length===1?'':'s'}`:'Choose at least one calendar to show.';this.cachedSignature=JSON.stringify(ranges)+'|'+[...this.selection].sort().join('|');}
    this.notify();
   }catch(error){if(gen!==this.generation||error.name==='AbortError')return;this.status=error.status===401?'expired':'error';this.message=error.message;this.notify()}
  }
 }
 const exported={CalendarConnection,normalizeEvent,occursOn,windows,SCOPE};root.CarolinaGoogle=exported;if(typeof module!=='undefined'&&module.exports)module.exports=exported;
})(typeof window!=='undefined'?window:globalThis);
