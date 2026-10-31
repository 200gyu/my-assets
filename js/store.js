// Data layer: Supabase when configured, otherwise browser storage (demo mode).
const TABLES = ['accounts', 'cards', 'transactions', 'recurring', 'investments', 'snapshots'];

const cfg = window.MA_CONFIG || {};
const cloud = !!(cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY && window.supabase);
const sb = cloud ? window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY) : null;

const LS = 'ma:v1:';
const lsGet = (t) => { try { return JSON.parse(localStorage.getItem(LS + t) || '[]'); } catch { return []; } };
const lsSet = (t, rows) => { try { localStorage.setItem(LS + t, JSON.stringify(rows)); } catch { /* storage blocked */ } };
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2));

export const Store = {
  cloud,
  data: Object.fromEntries(TABLES.map((t) => [t, []])),

  async session() {
    if (!cloud) return { demo: true };
    const { data } = await sb.auth.getSession();
    return data.session;
  },
  async signIn(email, password) { return sb.auth.signInWithPassword({ email, password }); },
  // confirmation mail returns to this page (must also be listed in Supabase → Auth → URL Configuration → Redirect URLs)
  async signUp(email, password) { return sb.auth.signUp({ email, password, options: { emailRedirectTo: location.origin + location.pathname } }); },
  async resend(email) { return sb.auth.resend({ type: 'signup', email, options: { emailRedirectTo: location.origin + location.pathname } }); },
  async signOut() { if (cloud) await sb.auth.signOut(); },

  async loadAll() {
    if (!cloud) {
      for (const t of TABLES) this.data[t] = lsGet(t);
      return;
    }
    const res = await Promise.all(TABLES.map((t) => sb.from(t).select('*')));
    res.forEach((r, i) => {
      if (r.error) throw new Error(`${TABLES[i]}: ${r.error.message}`);
      this.data[TABLES[i]] = r.data;
    });
  },

  async save(table, row) {
    const rec = { ...row };
    if (!rec.id) rec.id = uid();
    if (cloud) {
      delete rec.user_id;
      const { data, error } = await sb.from(table).upsert(rec).select().single();
      if (error) throw new Error(error.message);
      Object.assign(rec, data);
    }
    const list = this.data[table];
    const i = list.findIndex((x) => x.id === rec.id);
    if (i >= 0) list[i] = rec; else list.push(rec);
    if (!cloud) lsSet(table, list);
    return rec;
  },

  async saveMany(table, rows) {
    if (!rows.length) return [];
    const recs = rows.map((r) => ({ ...r, id: r.id || uid() }));
    if (cloud) {
      recs.forEach((r) => delete r.user_id);
      const { data, error } = await sb.from(table).upsert(recs).select();
      if (error) throw new Error(error.message);
      data.forEach((d) => { const i = this.data[table].findIndex((x) => x.id === d.id); if (i >= 0) this.data[table][i] = d; else this.data[table].push(d); });
      return data;
    }
    for (const r of recs) { const i = this.data[table].findIndex((x) => x.id === r.id); if (i >= 0) this.data[table][i] = r; else this.data[table].push(r); }
    lsSet(table, this.data[table]);
    return recs;
  },

  async remove(table, id) {
    if (cloud) {
      const { error } = await sb.from(table).delete().eq('id', id);
      if (error) throw new Error(error.message);
    }
    this.data[table] = this.data[table].filter((x) => x.id !== id);
    if (!cloud) lsSet(table, this.data[table]);
  },

  // daily net-worth snapshot (one row per date)
  async snapshot(date, values) {
    const existing = this.data.snapshots.find((s) => s.date === date);
    return this.save('snapshots', { ...(existing || {}), date, ...values });
  },

  exportJSON() { return JSON.stringify({ version: 1, exported_at: new Date().toISOString(), data: this.data }, null, 2); },

  async importJSON(text) {
    const parsed = JSON.parse(text);
    const src = parsed.data || parsed;
    for (const t of TABLES) if (Array.isArray(src[t])) await this.saveMany(t, src[t]);
  },

  async resetDemo() {
    if (cloud) return;
    for (const t of TABLES) { this.data[t] = []; lsSet(t, []); }
  },
};
