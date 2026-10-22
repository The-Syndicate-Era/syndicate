/* The Syndicate polling frontend: all privileged reads/actions use Edge Functions. */
(() => {
 'use strict';
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const showError=e=>({verification_required:'Your Discord verification has expired. Reload the page to verify again.',officer_required:'Officer access is required.',already_voted:'You already voted in this poll.',poll_not_open:'Voting has closed.',poll_operation_failed:'Polling request failed. Check the Edge Function logs.'}[e] || e || 'Unexpected error');
 async function setupAccess(role) {
  const db=window.syndicateDB;
  if(!db?.auth?.getUser) throw Error('Supabase did not load.');
  const {data:user,error:ue}=await db.auth.getUser();
  if(ue || !user?.user) throw Error('Sign in with Discord first.');
  const {data,error}=await db.functions.invoke('verify-syndicate-member');
  if(error) throw Error('Discord verification unavailable. Reload to try again.');
  if(role==='officer' && data?.isOfficer!==true) throw Error('Officer or Guild Master role required.');
  if(role==='guild' && data?.hasSyndicateRole!==true) throw Error('The Syndicate Discord role is required.');
  document.documentElement.classList.remove('syn-access-pending');
  return db;
 }
 async function api(db,action,params={}) {
  const {data,error}=await db.functions.invoke('syndicate-polls-api',{body:{action,...params}});
  if(error) {
   const response=error.context;
   let code='poll_operation_failed';
   try { if(response?.json) {const payload=await response.json();code=payload.error||code;} }catch{}
   throw Error(showError(code));
  }
  if(data?.error) throw Error(showError(data.error));
  return data;
 }
 function tabs(navSelector) {
  const buttons=[...document.querySelectorAll(`${navSelector} [data-tab]`)];
  const panels=[...document.querySelectorAll('[data-panel]')];
  function activate(name){buttons.forEach(b=>b.setAttribute('aria-selected',String(b.dataset.tab===name)));panels.forEach(p=>p.classList.toggle('poll-hidden',p.dataset.panel!==name));}
  buttons.forEach(b=>b.addEventListener('click',()=>activate(b.dataset.tab)));
  if(buttons.length)activate(buttons[0].dataset.tab);
  return activate;
 }
 function remaining(date){const n=Date.parse(date)-Date.now();if(n<=0)return 'Voting closed';const m=Math.ceil(n/60000);return m<60?`${m} min remaining`:m<2880?`${Math.ceil(m/60)} hours remaining`:`${Math.ceil(m/1440)} days remaining`;}
 function resultMarkup(p) {
  if(p.ballot_count==null)return '<p class="poll-help">Results are hidden while voting is open.</p>';
  let html=`<p class="poll-meta">${Number(p.ballot_count)} anonymous responses</p>`;
  if(p.question_type==='text') {
   if(p.text_answers) html += p.text_answers.length? p.text_answers.map(a=>`<blockquote class="poll-answer">${esc(a)}</blockquote>`).join(''):'<p>No written responses.</p>';
   else html+='<p>Written responses are reviewed privately by officers.</p>';
  } else {
   html+=p.options.map(o=>{let pct=p.ballot_count?Math.round(100*o.count/p.ballot_count):0;return `<div class="poll-result"><div class="poll-result-line"><span>${esc(o.text)}</span><span>${o.count} (${pct}%)</span></div><div class="poll-bar"><span style="width:${pct}%"></span></div></div>`;}).join('');
   if(p.question_type==='multiple')html+='<p class="poll-help">Multiple selections were allowed, so percentages may total more than 100%.</p>';
  }
  return html;
 }
 function voteCard(p,mode) {
  const active=p.status==='open' && !p.complete && Date.parse(p.starts_at)<=Date.now();
  const done=p.voted;
  let html=`<article class="poll-card"><div class="poll-heading-line"><span class="poll-badge">${active?'Voting Open':'Closed'}</span><span class="poll-meta">${active?remaining(p.ends_at):'Finalized'}</span></div><h3>${esc(p.title)}</h3>`;
  if(p.description)html+=`<p class="poll-desc">${esc(p.description)}</p>`;
  if(active && !done){
   html+=`<form class="poll-vote-form" data-id="${p.id}" data-kind="${p.question_type}"><div class="poll-choices">`;
   if(p.question_type==='text')html+='<label class="poll-field">Your anonymous answer<textarea name="answer" maxlength="4000" required></textarea></label>';
   else html+=p.options.map(o=>`<label class="poll-choice"><input type="${p.question_type==='single'?'radio':'checkbox'}" name="choice" value="${o.id}"> ${esc(o.text)}</label>`).join('');
   html+='</div><button class="poll-btn" type="submit">Cast Anonymous Vote</button><p class="poll-note">One submission per poll. Answers cannot be changed.</p></form>';
  } else if(done)html+='<div class="poll-alert">✓ Your vote has been recorded anonymously.</div>';
  else if(active)html+='<p class="poll-help">Voting not available.</p>';
  if(!active && (mode==='officer'||p.published))html+=`<div class="poll-results"><h4>Final Results</h4>${resultMarkup(p)}</div>`;
  return html+'</article>';
 }
 function wireVoteForms(container,db,reload){
  container.querySelectorAll('.poll-vote-form').forEach(form=>form.addEventListener('submit',async event=>{
   event.preventDefault(); const kind=form.dataset.kind;
   const selected=[...form.querySelectorAll('input[name="choice"]:checked')].map(el=>Number(el.value));
   const answer=kind==='text'?form.querySelector('textarea[name="answer"]').value.trim():null;
   if((kind==='text'&&!answer)||(kind!=='text'&&!selected.length)){alert('Please choose an answer before submitting.');return;}
   if(!confirm('Submit your anonymous vote? You will not be able to change it.'))return;
   const button=form.querySelector('button[type="submit"]');button.disabled=true;button.textContent='Submitting…';
   try{
    const {data,error}=await db.functions.invoke('syndicate-submit-vote',{body:{poll_id:Number(form.dataset.id),option_ids:selected,text_answer:answer}});
    if(error){let code='submission_failed';try{code=(await error.context.json()).status||code;}catch{}throw Error(showError(code));}
    if(data?.success!==true)throw Error(data?.error||'Vote not recorded.');
    await reload();
   }catch(e){alert(e.message||'Submission failed.');button.disabled=false;button.textContent='Cast Anonymous Vote';}
  }));
 }
 async function initVotePage(role){
  const auth=document.getElementById('pollAuth'),content=document.getElementById('pollsContent');
  try {
   const db=await setupAccess(role);
   auth.classList.add('poll-hidden');content.classList.remove('poll-hidden');
   tabs(role==='guild'?'#guildPollNav':'#officerPollNav');
   const active=document.getElementById('pollActiveList'),history=document.getElementById('pollHistoryList');
   async function reload(){
    const {polls}=await api(db,'list',{audience:role});
    const open=polls.filter(p=>p.status==='open'&&!p.complete&&Date.parse(p.starts_at)<=Date.now());
    const closed=polls.filter(p=>p.complete&&(role==='officer'||p.published));
    active.innerHTML=open.length?open.map(p=>voteCard(p,role)).join(''):'<div class="poll-card">No active polls right now.</div>';
    history.innerHTML=closed.length?closed.map(p=>voteCard(p,role)).join(''):'<div class="poll-card">No published results yet.</div>';
    wireVoteForms(active,db,reload);
   }
   await reload();
  }catch(e){auth.textContent=e.message||'Unable to load polls.';auth.classList.remove('poll-hidden');}
 }
 window.syndicatePollsUI={esc,api,tabs,setupAccess,resultMarkup,initVotePage,showError};
})();
