/* The Syndicate | Shared public add-on data */
(function (root) {
  'use strict';
  async function getAddons() {
    const db = root.syndicateDB;
    if (!db || typeof db.from !== 'function') {
      throw new Error('Supabase is not ready. Check settings/supabase-config.js.');
    }
    const { data, error } = await db.from('guild_addons')
      .select('id,name,description,url,category,category_label,directory_status,raid_status,search_terms,sort_order')
      .eq('is_active',true)
      .order('sort_order',{ascending:true})
      .order('name',{ascending:true});
    if (error) throw new Error(error.message);
    return data || [];
  }
  root.SyndicateAddons = Object.freeze({ getAddons });
})(window);
