/* THE SYNDICATE — settings/raid-data.js
   Shared raid names, order, and read-only catalog helpers.
   Requires window.syndicateDB from settings/supabase-config.js for queries.
*/
(function () {
  'use strict';
  const RAIDS = Object.freeze([
    { code: 'Ony', name: "Onyxia's Lair", shortName: 'Ony' },
    { code: 'ZG', name: "Zul'Gurub", shortName: 'ZG' },
    { code: 'AQ20', name: "Ruins of Ahn'Qiraj", shortName: 'AQ20' },
    { code: 'MC', name: 'Molten Core', shortName: 'MC' },
    { code: 'BWL', name: 'Blackwing Lair', shortName: 'BWL' },
    { code: 'AQ40', name: "Temple of Ahn'Qiraj", shortName: 'AQ40' },
    { code: 'Naxx', name: 'Naxxramas', shortName: 'Naxx' }
  ]);
  const aliases = Object.freeze({ ONY: 'Ony', ONYXIA: 'Ony', ZG: 'ZG', AQ20: 'AQ20', MC: 'MC', BWL: 'BWL', AQ40: 'AQ40', NAXX: 'Naxx', NAXXRAMAS: 'Naxx' });

  function normalizeRaidCode(value) {
    return aliases[String(value ?? '').trim().toUpperCase()] || null;
  }
  function getRaid(value) {
    const code = normalizeRaidCode(value);
    return RAIDS.find(raid => raid.code === code) || null;
  }
  function sortRaids(codes) {
    const order = new Map(RAIDS.map((raid, index) => [raid.code, index]));
    return [...codes].sort((a, b) =>
      (order.get(normalizeRaidCode(a)) ?? 999) - (order.get(normalizeRaidCode(b)) ?? 999)
    );
  }
  function db() {
    if (!window.syndicateDB || typeof window.syndicateDB.from !== 'function') {
      throw new Error('Supabase is not ready. Load the Supabase library and settings/supabase-config.js first.');
    }
    return window.syndicateDB;
  }
  async function getBosses(raidCode) {
    const code = normalizeRaidCode(raidCode);
    if (!code) throw new Error('Unknown raid code.');
    const { data, error } = await db().from('raid_bosses')
      .select('id,raid_code,boss_name,display_order,is_active')
      .eq('raid_code', code).eq('is_active', true)
      .order('display_order', { ascending: true })
      .order('id', { ascending: true });
    if (error) throw error;
    return data || [];
  }
  async function getBossLoot(bossId) {
    if (!Number.isSafeInteger(Number(bossId)) || Number(bossId) <= 0) throw new Error('Invalid boss ID.');
    const { data: links, error: linkError } = await db().from('raid_boss_loot')
      .select('item_id').eq('boss_id', Number(bossId));
    if (linkError) throw linkError;
    const ids = [...new Set((links || []).map(row => row.item_id))];
    if (!ids.length) return [];
    const { data, error } = await db().from('raid_items')
      .select('id,wow_item_id,item_name,equipment_slot,item_level,reservation_status,sr_eligible,is_active')
      .in('id', ids).eq('is_active', true).order('item_name');
    if (error) throw error;
    return data || [];
  }
  window.SyndicateRaids = Object.freeze({ RAIDS, normalizeRaidCode, getRaid, sortRaids, getBosses, getBossLoot });
})();

