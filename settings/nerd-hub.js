(()=>{'use strict';
const el=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const date=v=>v?new Date(String(v).slice(0,10)+'T12:00:00').toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'}):'—';
const num=v=>Number(v||0).toLocaleString();
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
async function analytics(){status('analytics-data','Loading raid analytics…');try{
 const d=await api('analytics');
 const h=d.history||[], months=d.monthly||[], aq=d.aq40||[], comps=d.composition||[];
 const latest=months.at(-1)||{};
 let html=`<div class="nh-stats"><div class="nh-stat"><small>Logged raid sessions</small><strong>${num(h.length)}</strong></div><div class="nh-stat"><small>Latest month independence</small><strong>${latest.guild_independence_pct??'—'}%</strong></div><div class="nh-stat"><small>Latest tracked month</small><strong>${esc(String(latest.raid_month||'—').slice(0,7))}</strong></div></div>`;
 html+=`<section class="nh-section"><h2>Guild Independence by Month</h2><p class="nh-note">Historically accurate membership at each raid, not today's roster.</p>${bars(months.map(x=>({label:String(x.raid_month||'').slice(0,7),value:`${x.guild_independence_pct??0}%`,pct:x.guild_independence_pct||0})))}</section>`;
 html+=`<section class="nh-section"><h2>Raid Composition</h2><p class="nh-note">Syndicate · Partners · PUGs · Outside unclassified · Unknown</p>${comps.slice(-15).reverse().map(x=>`<div class="nh-card"><strong>${esc(x.raid_name||x.name||'Raid')} · ${esc(x.raid_date||'')}</strong>${composition(x)}<p class="nh-note">${esc(String(x.guild_independence_pct??'—'))}% Syndicate</p></div>`).join('')||'<p class="nh-empty">No composition records.</p>'}<div class="nh-legend">${['Syndicate','Partners','PUGs','Unclassified','Unknown'].map((t,i)=>`<span><i style="background:${colors[i]}"></i>${t}</span>`).join('')}</div></section>`;
 html+=`<section class="nh-section"><h2>AQ40 Lockout Progress</h2>${table(['Part 1','Part 2','Remaining on Part 2','Combined'],aq.slice().reverse().map(x=>`<tr><td>${esc(date(x.part1_date))}: ${num(x.part1_kills)}/${num(x.total_bosses)}</td><td>${esc(date(x.part2_date))}: ${num(x.part2_kills)}</td><td>${num(x.part2_kills)}/${num(x.remaining_for_part2)}</td><td>${num(x.combined_kills)}/${num(x.total_bosses)} (${num(x.combined_completion_pct)}%)</td></tr>`))}</section>`;
 html+=`<section class="nh-section"><h2>Raid History</h2>${table(['Date / Raid','Bosses','Wipes','Attendance'],h.map(x=>`<tr><td>${esc(date(x.raid_date))}<div>${esc(x.raid_name)}</div>${x.report_url&&/^https:\/\//.test(x.report_url)?`<a class="nh-link" target="_blank" rel="noopener noreferrer" href="${esc(x.report_url)}">Warcraft Logs</a>`:''}</td><td>${num(x.bosses_killed)}/${num(x.total_bosses)}</td><td>${num(x.boss_wipes)}</td><td>${num(x.attendance_records)}</td></tr>`))}</section>`;
 el('analytics-data').innerHTML=html;
 }catch(e){status('analytics-data',e.message,true)}
}
async function leaderboard(){status('leaderboard-data','Loading rankings…');try{
 const d=await api('leaderboard',{raid_key:el('raid-filter').value});
 const rs=d.raiders||[];
 el('leaderboard-data').innerHTML=rs.length?table(['#','Raider','Last raid','Raids'],rs.map(x=>`<tr><td>${num(x.rank)}</td><td><strong>${esc(x.raider_name)}</strong></td><td class="nh-date">${esc(date(x.last_raid_date))}</td><td><strong>${num(x.raids_attended)}</strong></td></tr>`)):'<p class="nh-empty">No raiders found for this raid type.</p>';
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
 let html=`<div class="nh-card"><h2>${esc(p.name)} <span class="nh-tag">${esc(p.association)}</span></h2><p class="nh-muted">Main: ${esc(p.main)} ${p.current_rank?' · '+esc(p.current_rank):''}</p><div class="nh-stats"><div class="nh-stat"><small>Raids attended</small><strong>${num(p.raids_attended)}</strong></div><div class="nh-stat"><small>Attendance</small><strong>${num(p.attendance_pct)}%</strong></div><div class="nh-stat"><small>Last raid</small><strong>${esc(date(p.last_raid_date))}</strong></div></div><p class="nh-note">Attendance is out of ${num(p.total_logged_raids)} logged raid sessions.</p></div>`;
 html+=`<section class="nh-section"><h2>Recent Raid Activity — Last 30 Days</h2>${bars(rs.map(x=>({label:x.raid_type,value:`${x.attended}/${x.total} (${x.pct}%)`,pct:x.pct})))}</section>`;
 html+=`<section class="nh-section"><h2>Raiding Characters</h2>${chars.length?table(['Character','Class / Association','Last raid','Raids'],chars.sort((a,b)=>b.raids_attended-a.raids_attended).map(c=>`<tr><td>${esc(c.character_name)} ${c.is_main?'<span class="nh-pill">Main</span>':''}</td><td>${esc(c.character_class||'—')}<div class="nh-note">${esc(c.character_association)}</div></td><td>${esc(date(c.last_raid_date))}</td><td>${num(c.raids_attended)}</td></tr>`)):'<p class="nh-empty">No linked boss-participation characters found.</p>'}</section>`;
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


const WOW_CLASS_COLORS = {
  warrior: "#C79C6E",
  paladin: "#F58CBA",
  hunter: "#ABD473",
  rogue: "#FFF569",
  priest: "#FFFFFF",
  shaman: "#0070DE",
  mage: "#69CCF0",
  warlock: "#9482C9",
  druid: "#FF7D0A"
};

function classColor(characterClass) {
  return WOW_CLASS_COLORS[
    String(characterClass || "").trim().toLowerCase()
  ] || "#EBC46E";
}
