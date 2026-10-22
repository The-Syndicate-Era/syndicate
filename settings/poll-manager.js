window.addEventListener('load',async()=>{
 const ui=window.syndicatePollsUI,get=id=>document.getElementById(id);
 const activate=ui.tabs('#managerNav');
 const banner=get('managerStatus');let db,polls=[];
 const audienceTabs=[...document.querySelectorAll('.poll-audience-tab')];
 const audience=()=>get('audience').value;
 function setAudience(value){
  get('audience').value=value;
  audienceTabs.forEach(t=>{const selected=t.dataset.audience===value;t.setAttribute('aria-selected',String(selected));t.classList.toggle('guild-selected',selected&&value==='guild');t.classList.toggle('officer-selected',selected&&value==='officer');});
  const guild=value==='guild';
  get('audienceBanner').className='poll-audience-banner '+(guild?'is-guild':'is-officer');
  get('audienceBanner').textContent=guild?'GUILD POLL — Visible to Syndicate members.':'OFFICER POLL — Dark Council only; totals hidden while voting is open.';
  get('publishWarning').textContent=guild?'You are creating a GUILD poll for Syndicate members.':'You are creating an OFFICER poll for the Dark Council.';
  get('createButton').textContent=`Create ${value.toUpperCase()} Poll`;
  get('publishMode').disabled=!guild;
  get('previewPanel').classList.add('poll-hidden');
 }
 audienceTabs.forEach(t=>t.addEventListener('click',()=>{if(t.dataset.audience!==audience() && (get('title').value.trim()||get('description').value.trim())){if(!confirm('Switch poll audience? Existing draft text will remain.'))return;}setAudience(t.dataset.audience);}));
 get('kind').addEventListener('change',()=>get('answerSection').classList.toggle('poll-hidden',get('kind').value==='text'));
 get('duration').addEventListener('change',()=>get('customSection').classList.toggle('poll-hidden',get('duration').value!=='custom'));
 function readDraft(){
  const kind=get('kind').value;const options=get('answers').value.split('\n').map(s=>s.trim()).filter(Boolean);
  const deadline=get('duration').value==='custom'?new Date(get('customEnd').value):new Date(Date.now()+Number(get('duration').value)*60000);
  if(!get('title').value.trim())throw Error('Enter a question first.');
  if(kind!=='text'&&(options.length<2||options.length>20))throw Error('Choice polls need 2–20 answers.');
  if(!Number.isFinite(deadline.getTime())||deadline.getTime()<=Date.now()+60000)throw Error('Choose a deadline more than one minute in the future.');
  return {title:get('title').value.trim(),description:get('description').value.trim(),audience:audience(),question_type:kind,options:kind==='text'?[]:options,ends_at:deadline.toISOString(),publish_mode:audience()==='guild'?get('publishMode').value:'manual'};
 }
 get('preview').addEventListener('click',()=>{try{
  const p=readDraft();const options=p.question_type==='text'?'<p>Anonymous written answer</p>':p.options.map(x=>`<div class="poll-choice">${ui.esc(x)}</div>`).join('');
  get('previewBody').innerHTML=`<p class="poll-meta">${p.audience.toUpperCase()} poll · closes ${new Date(p.ends_at).toLocaleString()}</p><h3>${ui.esc(p.title)}</h3><p>${ui.esc(p.description)}</p>${options}`;
  get('previewPanel').classList.remove('poll-hidden');
 }catch(e){alert(e.message);}});
 get('pollCreator').addEventListener('submit',async e=>{
  e.preventDefault();let p;try{p=readDraft();}catch(err){alert(err.message);return;}
  const phrase=p.audience==='guild'?'GUILD MEMBERS':'OFFICERS ONLY';
  if(!confirm(`CREATE ${p.audience.toUpperCase()} POLL?\n\n${p.title}\n\nAudience: ${phrase}\nCloses: ${new Date(p.ends_at).toLocaleString()}\n\nThis will immediately open voting.`))return;
  get('createButton').disabled=true;
  try{const result=await ui.api(db,'create',p);alert(`Poll #${result.poll_id} created for ${phrase}.`);get('pollCreator').reset();setAudience('guild');get('previewPanel').classList.add('poll-hidden');await reload();activate('active');}
  catch(err){alert(err.message);}finally{get('createButton').disabled=false;}
 });
 function manageCard(p){
  const title=ui.esc(p.title),type=p.audience==='guild'?'GUILD':'OFFICER';
  const active=p.status==='open'&&!p.complete;
  let html=`<article class="poll-card"><div class="poll-heading-line"><span class="poll-badge">${type} • ${p.complete?'Closed':p.status.toUpperCase()}</span><span class="poll-meta">#${p.id} • ${p.ends_at?new Date(p.ends_at).toLocaleString():''}</span></div><h3>${title}</h3><p>${ui.esc(p.description)}</p>`;
  if(p.ballot_count!=null)html+=ui.resultMarkup(p);
  else html+='<p class="poll-help">Vote totals hidden until closing.</p>';
  if(p.audience==='guild'&&p.complete&&!p.published)html+='<p class="poll-help">Awaiting publication to guild archive.</p>';
  html+=`<div class="poll-btn-row" data-id="${p.id}">`;
  if(active){html+='<button class="poll-btn secondary" data-act="extend">Extend</button><button class="poll-btn secondary" data-act="close">Close Now</button>';}
  if(p.audience==='guild'&&p.complete&&!p.published)html+='<button class="poll-btn" data-act="publish">Publish Results</button>';
  html+='<button class="poll-btn danger" data-act="delete">Delete Poll</button></div></article>';
  return html;
 }
 async function reload(){
  const data=await ui.api(db,'list',{audience:'all'});polls=data.polls;
  const active=polls.filter(p=>!p.complete && p.status==='open');
  const old=polls.filter(p=>p.complete || p.status!=='open');
  get('managerActive').innerHTML=active.length?active.map(manageCard).join(''):'<div class="poll-card">No active polls.</div>';
  get('managerHistory').innerHTML=old.length?old.map(manageCard).join(''):'<div class="poll-card">No completed polls yet.</div>';
 }
 async function act(ev){
  const button=ev.target.closest('button[data-act]');if(!button)return;
  const id=Number(button.closest('[data-id]').dataset.id),p=polls.find(p=>p.id===id);if(!p)return;
  const action=button.dataset.act,params={poll_id:id};
  if(action==='delete'){
   const typed=prompt(`PERMANENTLY DELETE ${p.audience.toUpperCase()} POLL #${p.id}?\n\n${p.title}\n\nThis deletes the question, all ballots, participation records, and published history.\n\nType the FULL poll title to confirm:`);
   if(typed!==p.title){if(typed!==null)alert('Title did not match. Nothing deleted.');return;}
   if(!confirm('FINAL CONFIRMATION: Permanently delete this poll and every response?'))return;
   params.confirm_title=typed;
  }
  if(action==='close'&&!confirm(`Close "${p.title}" now? Voting will stop immediately.`))return;
  if(action==='publish'&&!confirm(`Publish final results of "${p.title}" to the guild archive?`))return;
  if(action==='extend'){
   const raw=prompt(`New deadline (local date and time), after ${new Date(p.ends_at).toLocaleString()}:\nFormat: YYYY-MM-DDTHH:MM`, new Date(Date.parse(p.ends_at)+86400000).toLocaleString('sv-SE').replace(' ','T').slice(0,16));
   if(!raw)return;const timestamp=new Date(raw);if(!Number.isFinite(timestamp.getTime())){alert('Invalid date.');return;}
   params.ends_at=timestamp.toISOString();
  }
  button.disabled=true;
  try{await ui.api(db,action,params);await reload();}
  catch(err){alert(err.message);}finally{button.disabled=false;}
 }
 get('managerActive').addEventListener('click',act);get('managerHistory').addEventListener('click',act);
 try{db=await ui.setupAccess('officer');banner.textContent='Officer access confirmed. Poll changes are live.';await reload();}
 catch(err){banner.textContent=err.message;get('createButton').disabled=true;}
});
