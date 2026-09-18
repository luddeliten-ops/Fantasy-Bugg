/* Felix Bugg Quiz admin panel. Uses the existing Supabase client. */
(() => {
  const ADMIN_UID = '7408ec3a-29d1-4b48-8cd0-30d20b9155d7';
  const fields = ['q1','q2','q3','q4','q5','q6','q7','q8a','q8b','q8c','q8d','q8e','q9','q10'];
  const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const formatTime = ms => (Number(ms) / 1000).toFixed(1) + ' s';
  async function mountFelixQuizAdmin() {
    const client = typeof sb !== 'undefined' ? sb : null;
    const root = document.getElementById('admin');
    if (!root || !client || root.querySelector('#felixQuizAdmin')) return;
    const { data: { user }, error: authError } = await client.auth.getUser();
    if (authError || !user || user.id !== ADMIN_UID) return;
    const panel = document.createElement('div');
    panel.id = 'felixQuizAdmin';
    panel.className = 'panel';
    panel.style.marginTop = '18px';
    panel.innerHTML = '<h2>Felix Bugg Quiz – resultat</h2><button type="button" class="btn blue" id="felixQuizRefresh">Uppdatera resultat</button><p id="felixQuizAdminStatus" role="status"></p><div id="felixQuizAdminResults" style="overflow-x:auto"></div>';
    root.append(panel);
    const status = panel.querySelector('#felixQuizAdminStatus');
    const output = panel.querySelector('#felixQuizAdminResults');
    async function refresh() {
      status.textContent = 'Hämtar resultat…';
      const { data, error } = await client.rpc('quiz_admin_results');
      if (error) { status.textContent = 'Kunde inte läsa resultat: ' + error.message; output.replaceChildren(); return; }
      const attempts = Array.isArray(data) ? data : [];
      status.textContent = attempts.length + ' inskickade quiz.';
      if (!attempts.length) { output.textContent = 'Inga resultat ännu.'; return; }
      output.innerHTML = '<table class="pointsTable"><thead><tr><th>Placering</th><th>Deltagare (användar-ID)</th><th>Poäng</th><th>Tid</th><th>Svar</th></tr></thead><tbody>' + attempts.map((attempt, index) => '<tr><td>' + (index + 1) + '</td><td>' + escapeHTML(attempt.user_id) + '</td><td>' + escapeHTML(attempt.score) + '/10</td><td>' + formatTime(attempt.elapsed_ms) + '</td><td><details><summary>Visa svar</summary>' + fields.map(field => '<div><strong>' + field.toUpperCase() + ':</strong> ' + escapeHTML(attempt.answers?.[field] || 'Ej besvarad') + '</div>').join('') + '</details></td></tr>').join('') + '</tbody></table>';
    }
    panel.querySelector('#felixQuizRefresh').addEventListener('click', refresh);
    await refresh();
  }
  window.mountFelixQuizAdmin = mountFelixQuizAdmin;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mountFelixQuizAdmin); else mountFelixQuizAdmin();
})();