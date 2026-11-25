/* THE SYNDICATE — DARK COUNCIL / DARK PILLAR RAID ACCESS */
(() => {
  'use strict';
  const homeURL = new URL('../index.html', document.currentScript.src).href;
  const root = document.documentElement;
  let checking = false;
  root.classList.add('syn-access-pending');
  root.classList.remove('syn-access-granted');

  function message(title, detail, denied = false) {
    const show = () => {
      document.getElementById('syndicate-officer-access-message')?.remove();
      const panel = document.createElement('section');
      panel.id = 'syndicate-officer-access-message';
      panel.className = 'syn-officer-access-panel';
      panel.setAttribute('role', 'alert');
      Object.assign(panel.style, {maxWidth:'35rem',margin:'5rem auto',padding:'2rem',textAlign:'center',background:'#15110d',border:'1px solid #8f7320',color:'#e4dac7'});
      const heading = document.createElement('h2'); heading.textContent = title;
      const text = document.createElement('p'); text.textContent = detail;
      const button = document.createElement('button'); button.type = 'button';
      button.className = 'btn'; button.textContent = denied ? 'Return to The Syndicate' : 'Try Again';
      button.onclick = () => { if (denied) location.replace(homeURL); else check(); };
      panel.append(heading,text,button); document.body.append(panel);
    };
    if (document.body) show(); else document.addEventListener('DOMContentLoaded',show,{once:true});
  }

  async function check() {
    if (checking) return;
    checking = true;
    try {
      const auth = window.syndicateAuth, db = window.syndicateDB;
      if (!auth || !db) throw new Error('Authentication unavailable');
      const result = await auth.verifyMembership();
      if (result?.status === 'logged_out') {
        try { sessionStorage.setItem('syndicate_return_to',location.pathname+location.search+location.hash); } catch {}
        location.replace(homeURL); return;
      }
      if (!result?.verified || result.status !== 'member') {
        const denied = ['not_member','discord_not_linked'].includes(result?.status);
        message(denied?'Raid Operations — Access Denied':'Verification Unavailable',denied?'Raid Operations is reserved for Dark Council and Dark Pillar.': 'Unable to verify Discord access. Please try again; if rate limited, wait about a minute.',denied); return;
      }
      const [officer,pillar,user] = await Promise.all([
        db.rpc('syndicate_is_officer'), db.rpc('syndicate_is_dark_pillar'), auth.getUser()
      ]);
      if (officer.error || pillar.error || !user?.id) throw new Error('Unable to confirm database permissions');
      if (officer.data !== true && pillar.data !== true) {
        message('Raid Operations — Access Denied','This page is reserved for Dark Council and Dark Pillar.',true); return;
      }
      window.syndicateRaidAccess = Object.freeze({isOfficer:officer.data===true,isDarkPillar:pillar.data===true,userId:user.id});
      document.getElementById('syndicate-officer-access-message')?.remove();
      root.classList.remove('syn-access-pending'); root.classList.add('syn-access-granted');
    } catch (error) {
      console.error('Raid access check failed:',error);
      message('Verification Unavailable','Unable to confirm Raid Operations permissions. Please try again.');
    } finally { checking = false; }
  }
  check();
})();
