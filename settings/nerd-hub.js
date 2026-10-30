(()=>{'use strict';
const el=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const date=v=>v?new Date(String(v).slice(0,10)+'T12:00:00').toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'}):'—';
const num=v=>Number(v||0).toLocaleString();

const WOW_CLASS_COLORS={
 warrior:'#C79C6E',paladin:'#F58CBA',hunter:'#ABD473',
 rogue:'#FFF569',priest:'#FFFFFF',shaman:'#0070DE',
 mage:'#69CCF0',warlock:'#9482C9',druid:'#FF7D0A'
};
const classColor=value=>WOW_CLASS_COLORS[String(value||'').trim().toLowerCase()]||null;
const safeColor=value=>classColor(value)||'#e9c170';
const className=(name,cls)=>`<span class="nh-character-name" style="color:${safeColor(cls)}">${esc(name)}</span>`;
const badgeClass=association=>/^ex[- ]syndicate$/i.test(String(association||''))?'is-former':
 /^(syndicate)$/i.test(String(association||''))?'':'is-outside';

const status=(id,message,error=false)=>{el(id).innerHTML=`<p class="nh-status ${error?'error':''}">${esc(message)}</p>`};
async function api(action,extras={}){
 const client=window.syndicateDB;
 if(!client)throw Error('Supabase is not ready. Please refresh after signing in.');
 const {data:{session},error:authErr}=await client.auth.getSession();
 if(authErr||!session)throw Error('Website login required.');
 const {data,error}=await client.functions.invoke('syndicate-nerd-data',{body:{action,...extras}});
 if(error){let message=data?.error||error.message;try{const d=await error.context?.json?.();message=d?.error||message;}catch{}throw Error(message);}
 if(!data?.success)throw Error(data?.error||'Could not load report');
 return data;
}
function table(head,rows){return `<div class="nh-table-wrap"><table class="nh-table"><thead><tr>${head.map(h=>`<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table></div>`}
function bars(items){return `<div class="nh-bars">${items.map(x=>`<div><div class="nh-bar-line"><span>${esc(x.label)}</span><strong>${esc(x.value)}</strong></div><div class="nh-bar-track"><div class="nh-bar-fill" style="width:${Math.max(0,Math.min(100,Number(x.pct)||0))}%"></div></div></div>`).join('')}</div>`}
const colors=['#c1a15b','#6e92b2','#96918b','#7c705d','#605a53'];
function composition(row){const names=['syndicate','partners','pugs','outside_unclassified','unknown'];const total=names.reduce((s,k)=>s+Number(row[k]||0),0);if(!total)return '—';return `<div class="nh-composition">${names.map((k,i)=>`<span title="${esc(k)}: ${row[k]||0}" style="width:${Number(row[k]||0)*100/total}%;background:${colors[i]}"></span>`).join('')}</div>`}

let analyticsData=null;
const analyticsState={composition:{raid:'all',month:'all',search:'',limit:6},history:{raid:'all',month:'all',search:'',page:0}};
const PAGE_SIZE=10;
const raidOptions=[['all','All raid types'],['zg','ZG'],['aq20','AQ20'],['ony','Ony'],['mc','MC'],['bwl','BWL'],['aq40','AQ40'],['naxx','Naxx']];
const classOrder=['Warrior','Paladin','Hunter','Rogue','Priest','Shaman','Mage','Warlock','Druid'];
const classCache=new Map();
function raidKey(r){
 const k=String(r.raid_key||'').toLowerCase();if(k)return k;
 const n=String(r.raid_name||r.name||'').toLowerCase().trim();
 if(/^aq40/.test(n))return 'aq40';if(/^aq20/.test(n))return 'aq20';if(/^zg/.test(n))return 'zg';
 if(/^(bwl|blackwing)/.test(n))return 'bwl';if(/^(mc|molten core)/.test(n))return 'mc';
 if(/^ony/.test(n))return 'ony';if(/^naxx/.test(n))return 'naxx';return 'other';
}
function compositionSegments(items){
 const total=items.reduce((s,x)=>s+x.count,0);if(!total)return '<p class="nh-note">No recorded composition for this raid.</p>';
 return `<div class="nh-colored-bar" role="img" aria-label="${esc(items.map(x=>x.name+': '+x.count).join(', '))}">${items.filter(x=>x.count>0).map(x=>{
 const pct=x.count*100/total;
 return `<span title="${esc(x.name)}: ${x.count}" style="width:${pct.toFixed(4)}%;background:${x.color};color:${x.text||'#211b14'}">${pct>=5.5?num(x.count):''}</span>`;
 }).join('')}</div><div class="nh-analytic-legend">${items.filter(x=>x.count>0).map(x=>`<span><i class="nh-analytic-dot" style="background:${x.color}"></i>${esc(x.name)}: <strong>${num(x.count)}</strong></span>`).join('')}</div>`;
}
function guildComposition(row){
 const labels=['Syndicate','Partners','PUGs','Unclassified','Unknown'];
 const keys=['syndicate','partners','pugs','outside_unclassified','unknown'];
 return compositionSegments(keys.map((k,i)=>({name:labels[i],count:Number(row[k]||0),color:colors[i],text:i===0?'#1d180f':'#fff'})));
}
function classComposition(rows){
 const byName=new Map((rows||[]).map(x=>[String(x.class_name||'').toLowerCase(),Number(x.count||0)]));
 return compositionSegments(classOrder.map(c=>({name:c,count:byName.get(c.toLowerCase())||0,color:WOW_CLASS_COLORS[c.toLowerCase()],text:['Warlock','Shaman'].includes(c)?'#fff':'#1d180f'})));
}
function selectionOptions(options,selected){return options.map(([v,t])=>`<option value="${esc(v)}" ${v===selected?'selected':''}>${esc(t)}</option>`).join('')}
function monthOptions(selected){
 const months=[...new Set([...analyticsData.history.map(x=>String(x.raid_date||'').slice(0,7)),...analyticsData.monthly.map(x=>String(x.raid_month||'').slice(0,7))])].filter(x=>/^\d{4}-\d{2}$/.test(x)).sort().reverse();
 return selectionOptions([['all','All months'],...months.map(x=>[x,x])],selected);
}
function controls(section){
 const s=analyticsState[section];
 return `<div class="nh-analytic-controls" data-section="${section}"><label>Raid<select class="nh-select" data-filter="raid">${selectionOptions(raidOptions,s.raid)}</select></label><label>Month<select class="nh-select" data-filter="month">${monthOptions(s.month)}</select></label><label class="nh-grow">Search<input class="nh-input" data-filter="search" type="search" placeholder="Raid name or date…" value="${esc(s.search)}"></label></div>`;
}
function matches(row,section){
 const s=analyticsState[section],name=String(row.raid_name||row.name||'');
 const d=String(row.raid_date||'').slice(0,10);
 return (s.raid==='all'||raidKey(row)===s.raid)&&(s.month==='all'||d.slice(0,7)===s.month)&&(!s.search||(name+' '+d+' '+date(d)).toLowerCase().includes(s.search.toLowerCase()));
}
function raidBosses(row){
 const pair=(analyticsData.aq40||[]).find(x=>Number(x.part2_event_id)===Number(row.event_id));
 return pair?`${num(row.bosses_killed)}/${num(pair.remaining_for_part2)}`:`${num(row.bosses_killed)}/${num(row.total_bosses)}`;
}
function rowHeader(row){return `<span><strong>${esc(row.raid_name||'Raid')}</strong><div class="nh-analytic-meta">${esc(date(row.raid_date))}</div></span>`;}
function renderAnalytics(){
 if(!analyticsData)return;
 const host=el('analytics-data');const monthly=analyticsData.monthly;
 let html=`<section class="nh-analytic-section"><h3 class="nh-analytic-title">Guild Independence by Month</h3><p>Historically accurate membership at each raid, not today's roster.</p>${bars(monthly.map(x=>({label:String(x.raid_month||'').slice(0,7),value:`${x.guild_independence_pct??0}%`,pct:x.guild_independence_pct||0})))}</section>`;
 const comp=analyticsData.composition.filter(x=>matches(x,'composition')).sort((a,b)=>String(b.raid_date).localeCompare(String(a.raid_date))||Number(b.event_id)-Number(a.event_id));
 html+=`<section class="nh-analytic-section"><h3 class="nh-analytic-title">Raid Composition</h3><p>Guild composition at the time of each raid. Expand a session to see its counts.</p>${controls('composition')}<div class="nh-analytic-footer"><span class="nh-note">${num(comp.length)} matching raids</span><button class="nh-analytic-btn" data-expand-all="composition">Expand / Collapse all shown</button></div><div id="composition-list">${comp.slice(0,analyticsState.composition.limit).map(x=>`<details class="nh-analytic-row" data-event-id="${Number(x.event_id)}"><summary>${rowHeader(x)}<span class="nh-analytic-metrics">${num(x.guild_independence_pct)}% Syndicate</span></summary><div class="nh-analytic-row-content">${guildComposition(x)}<div class="nh-note">Counts reflect distinct character appearances for this raid.</div></div></details>`).join('')||'<div class="nh-analytic-empty">No raid composition matches your filters.</div>'}</div>${comp.length>analyticsState.composition.limit?'<button class="nh-analytic-btn" data-show-more="composition">Show more raids</button>':''}</section>`;
 const hist=analyticsData.history.filter(x=>matches(x,'history')).sort((a,b)=>String(b.raid_date).localeCompare(String(a.raid_date))||Number(b.event_id)-Number(a.event_id));
 const pages=Math.max(1,Math.ceil(hist.length/PAGE_SIZE));analyticsState.history.page=Math.min(Math.max(0,analyticsState.history.page),pages-1);
 const displayed=hist.slice(analyticsState.history.page*PAGE_SIZE,(analyticsState.history.page+1)*PAGE_SIZE);
 html+=`<section class="nh-analytic-section"><h3 class="nh-analytic-title">Raid History</h3><p>Expand a raid for boss progress, wipes, attendance and actual class counts. AQ40 Part 2 uses remaining bosses in its lockout.</p>${controls('history')}<div class="nh-analytic-footer"><span class="nh-note">${num(hist.length)} matching raids · page ${analyticsState.history.page+1} of ${pages}</span><button class="nh-analytic-btn" data-expand-all="history">Expand / Collapse all shown</button></div><div id="history-list">${displayed.map(x=>`<details class="nh-analytic-row" data-event-id="${Number(x.event_id)}"><summary>${rowHeader(x)}<span class="nh-analytic-metrics"><span>${esc(raidBosses(x))} bosses</span><span>${num(x.boss_wipes)} wipes</span><span>${num(x.attendance_records)} raiders</span></span></summary><div class="nh-analytic-row-content"><div class="nh-stats"><div class="nh-stat"><small>Bosses</small><strong>${esc(raidBosses(x))}</strong></div><div class="nh-stat"><small>Wipes</small><strong>${num(x.boss_wipes)}</strong></div><div class="nh-stat"><small>Attendance</small><strong>${num(x.attendance_records)}</strong></div></div><h4 style="color:#ead089;margin:14px 0 5px">Class Composition</h4><div class="nh-class-data" data-class-for="${Number(x.event_id)}"><p class="nh-note">Expand to load class counts…</p></div>${x.report_url&&/^https:\/\//.test(x.report_url)?`<a class="nh-link" href="${esc(x.report_url)}" target="_blank" rel="noopener noreferrer">Open Warcraft Logs</a>`:''}</div></details>`).join('')||'<div class="nh-analytic-empty">No raid history matches your filters.</div>'}</div><div class="nh-analytic-footer"><button class="nh-analytic-btn" data-history-step="-1" ${analyticsState.history.page===0?'disabled':''}>Previous</button><button class="nh-analytic-btn" data-history-step="1" ${analyticsState.history.page>=pages-1?'disabled':''}>Next</button></div></section>`;
 host.innerHTML=html;
 host.querySelectorAll('[data-filter]').forEach(input=>input.addEventListener(input.dataset.filter==='search'?'input':'change',()=>{
  const s=analyticsState[input.closest('[data-section]').dataset.section];s[input.dataset.filter]=input.value;
  s.limit=6;s.page=0;
  // On text search keep focus and caret position while replacing the DOM.
  const active=input.dataset.filter==='search';const section=input.closest('[data-section]').dataset.section;const cursor=active?input.selectionStart:null;
  renderAnalytics();
  if(active){const next=host.querySelector(`[data-section="${section}"] [data-filter="search"]`);next?.focus();try{next?.setSelectionRange(cursor,cursor)}catch{}}
 }));
 host.querySelectorAll('[data-show-more]').forEach(b=>b.addEventListener('click',()=>{analyticsState.composition.limit+=6;renderAnalytics()}));
 host.querySelectorAll('[data-history-step]').forEach(b=>b.addEventListener('click',()=>{analyticsState.history.page+=Number(b.dataset.historyStep);renderAnalytics()}));
 host.querySelectorAll('[data-expand-all]').forEach(b=>b.addEventListener('click',()=>{
  const entries=[...el(b.dataset.expandAll==='history'?'history-list':'composition-list').querySelectorAll('details')];const expand=entries.some(x=>!x.open);
  entries.forEach(x=>{x.open=expand;if(expand&&b.dataset.expandAll==='history')loadClass(x)});
 }));
 host.querySelectorAll('#history-list details').forEach(d=>d.addEventListener('toggle',()=>{if(d.open)loadClass(d)}));
}
async function loadClass(details){
 const node=details.querySelector('.nh-class-data');if(!node)return;
 const id=Number(node.dataset.classFor);
 if(classCache.has(id)){node.innerHTML=classComposition(classCache.get(id));return;}
 if(node.dataset.loading==='yes')return;
 node.dataset.loading='yes';node.innerHTML='<p class="nh-note">Loading class breakdown…</p>';
 try{const d=await api('class_composition',{event_id:id});classCache.set(id,d.classes||[]);
  if(node.isConnected)node.innerHTML=classComposition(d.classes||[]);
 }catch(e){if(node.isConnected)node.innerHTML=`<p class="nh-status error">${esc(e.message)}</p>`;}
 finally{delete node.dataset.loading}
}
async function analytics(){status('analytics-data','Loading raid analytics…');try{
 const d=await api('analytics');analyticsData={history:d.history||[],monthly:d.monthly||[],aq40:d.aq40||[],composition:d.composition||[]};renderAnalytics();
 }catch(e){status('analytics-data',e.message,true)}
}
async function leaderboard(){status('leaderboard-data','Loading rankings…');try{
 const d=await api('leaderboard',{raid_key:el('raid-filter').value});
 const rs=d.raiders||[];
 el('leaderboard-data').innerHTML=rs.length?table(['#','Raider','Last raid','Raids'],rs.map(x=>`<tr><td>${num(x.rank)}</td><td><strong>${className(x.raider_name,x.main_class||x.character_class)}</strong></td><td class="nh-date">${esc(date(x.last_raid_date))}</td><td><strong>${num(x.raids_attended)}</strong></td></tr>`)):'<p class="nh-empty">No raiders found for this raid type.</p>';
 }catch(e){status('leaderboard-data',e.message,true)}
}
async function search(q){el('profile-data').replaceChildren();status('lookup-results',`Searching for ${q}…`);try{
 const d=await api('search',{query:q});
 const host=el('lookup-results');host.replaceChildren();
 if(!d.matches?.length){status('lookup-results','No matching players or characters found.');return;}
 for(const x of d.matches){const b=document.createElement('button');b.type='button';b.className='nh-result';
 b.innerHTML=`<span><strong>${esc(x.name)}</strong><small style="display:block">Main: ${esc(x.main)}${x.matched_characters?.length?' · Matched: '+esc(x.matched_characters.join(', ')):''}</small></span><span class="nh-tag">${esc(x.association)}</span>`;
 b.addEventListener('click',()=>profile(x.player_id));host.append(b);}
 }catch(e){status('lookup-results',e.message,true)}
}
async function profile(player_id){status('profile-data','Loading profile…');try{
 const d=await api('profile',{player_id});const p=d.profile,rs=d.recent||[],chars=d.characters||[],history=d.history||[];
 const mainCharacter=chars.find(c=>c.is_main===true)||chars.find(c=>String(c.character_name||'').toLocaleLowerCase()===String(p.main||'').toLocaleLowerCase());
 const mainClass=mainCharacter?.character_class;
 let html=`<div class="nh-card"><div class="nh-raider-heading"><h2>${className(p.name,mainClass)}</h2><span class="nh-raider-badge ${badgeClass(p.association)}">${esc(p.association)}</span></div><p class="nh-muted nh-main-label">Main: ${className(p.main,mainClass)}${p.current_rank?' · '+esc(p.current_rank):''}</p><div class="nh-stats"><div class="nh-stat"><small>Raids attended</small><strong>${num(p.raids_attended)}</strong></div><div class="nh-stat"><small>Attendance</small><strong>${num(p.attendance_pct)}%</strong></div><div class="nh-stat"><small>Last raid</small><strong>${esc(date(p.last_raid_date))}</strong></div></div><p class="nh-note">Attendance is out of ${num(p.total_logged_raids)} logged raid sessions.</p></div>`;
 html+=`<section class="nh-section"><h2>Recent Raid Activity — Last 30 Days</h2>${bars(rs.map(x=>({label:x.raid_type,value:`${x.attended}/${x.total} (${x.pct}%)`,pct:x.pct})))}</section>`;
 html+=`<section class="nh-section"><h2>Raiding Characters</h2>${chars.length?table(['Character','Class / Association','Last raid','Raids'],chars.sort((a,b)=>b.raids_attended-a.raids_attended).map(c=>`<tr><td>${className(c.character_name,c.character_class)} ${c.is_main?'<span class="nh-pill">Main</span>':''}</td><td><span style="color:${safeColor(c.character_class)}">${esc(c.character_class||'—')}</span><div class="nh-note">${esc(c.character_association)}</div></td><td>${esc(date(c.last_raid_date))}</td><td>${num(c.raids_attended)}</td></tr>`)):'<p class="nh-empty">No linked boss-participation characters found.</p>'}</section>`;
 html+=`<section class="nh-section"><h2>Full Raid History</h2>${history.length?table(['Date','Raid','Type'],history.map(r=>`<tr><td>${esc(date(r.raid_date))}</td><td>${esc(r.raid_name)}</td><td>${esc(r.raid_type)}</td></tr>`)):'<p class="nh-empty">No raid attendance recorded.</p>'}</section>`;
 el('profile-data').innerHTML=html;
 }catch(e){status('profile-data',e.message,true)}
}
let loadedAnalytics=false;
for(const b of document.querySelectorAll('.nh-tab'))b.addEventListener('click',()=>{const name=b.dataset.tab;for(const t of document.querySelectorAll('.nh-tab'))t.setAttribute('aria-selected',String(t===b));for(const p of document.querySelectorAll('.nh-pane'))p.hidden=p.id!=='pane-'+name;if(name==='analytics'&&!loadedAnalytics){loadedAnalytics=true;analytics();}if(name==='top')leaderboard();});
el('raid-filter').addEventListener('change',leaderboard);
el('lookup-form').addEventListener('submit',e=>{e.preventDefault();const v=el('lookup-input').value.trim();if(v.length>=2)search(v)});
// Delay the initial API request until Supabase + officer guard can initialize.
window.addEventListener('load',()=>{loadedAnalytics=true;analytics()});
})();
