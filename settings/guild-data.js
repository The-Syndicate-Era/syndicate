/* THE SYNDICATE — settings/guild-data.js
   Shared guild roster lookups. Requires settings/supabase-config.js
   to define window.syndicateDB before these functions are called.
   Read operations only; database RLS still controls access.
*/
(function () {
  'use strict';
  const rosterTable = 'guild_roster';
  const normalizeName = (value) => String(value ?? '').trim().toLocaleLowerCase('en-US');
  const cleanName = (value) => String(value ?? '').trim();

  function db() {
    const client = window.syndicateDB;
    if (!client || typeof client.from !== 'function') {
      throw new Error('Supabase is not ready. Load the Supabase library and settings/supabase-config.js first.');
    }
    return client;
  }

  async function findRosterCharacter(toonName) {
    const name = cleanName(toonName);
    if (!name) return null;
    // Supabase's .ilike uses SQL pattern characters; escaping those is
    // backend-dependent. We match normalized strings after a name search.
    // Restrict to names that do not contain SQL LIKE wildcard characters.
    if (/[\\%_]/.test(name)) throw new Error('Invalid characters in character name.');
    const { data, error } = await db()
      .from(rosterTable)
      .select('*')
      .ilike('Name', name)
      .limit(20);
    if (error) throw error;
    return (data || []).find(row => normalizeName(row.Name) === normalizeName(name)) || null;
  }

  async function isGuildMember(toonName) {
    return Boolean(await findRosterCharacter(toonName));
  }

  async function resolveGuild(toonName, suppliedGuild = '') {
    const found = await findRosterCharacter(toonName);
    if (found) {
      return { toonName: cleanName(found.Name), guildName: 'The Syndicate', playerType: 'member', onRoster: true };
    }
    const guildName = cleanName(suppliedGuild);
    return { toonName: cleanName(toonName), guildName: guildName || null, playerType: guildName && guildName.toLowerCase() !== 'pug' ? 'partner' : 'pug', onRoster: false };
  }

  async function getRosterCounts() {
    const rows = [];
    // Supabase commonly limits results to 1,000 rows per request.
    // The Name and normalized_main_alt columns are part of the existing roster.
    for (let start = 0; start < 100000; start += 1000) {
      const { data, error } = await db()
        .from(rosterTable)
        .select('Name,normalized_main_alt')
        .order('Name', { ascending: true })
        .range(start, start + 999);
      if (error) throw error;
      const batch = data || [];
      rows.push(...batch);
      if (batch.length < 1000) break;
      if (start === 99000) throw new Error('Roster exceeds supported counting range.');
    }
    let mains = 0;
    let alts = 0;
    for (const character of rows) {
      const classification = String(character.normalized_main_alt ?? '').trim().toLowerCase();
      if (classification === 'main') mains++;
      else if (classification === 'alt') alts++;
    }
    return { total: rows.length, mains, alts, unclassified: rows.length - mains - alts };
  }

  window.SyndicateGuild = Object.freeze({
    normalizeName, findRosterCharacter, isGuildMember, resolveGuild, getRosterCounts
  });
})();
