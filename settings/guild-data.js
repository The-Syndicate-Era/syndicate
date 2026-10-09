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

  window.SyndicateGuild = Object.freeze({
    normalizeName, findRosterCharacter, isGuildMember, resolveGuild
  });
})();

