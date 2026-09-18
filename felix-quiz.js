/* Felix Bugg Quiz: mount in existing #quiz section. Requires quiz_submit and quiz_admin_results RPCs. */
(() => {
  const questions = [
    ['Hur många av personerna i årets SM-final har tidigare vunnit ett SM-guld i någon form?', ['9','10','14','11']],
    ['Vilken låt har spelats flest gånger i en SM-final någonsin?', ['Farväl Goodbye – Lasse Stefanz','Yea Yea Yea – Fernandoz','Våga Stuffa – Stefan Borsch','Dra dit pepparn växer – Sten & Stanley']],
    ['Hur många tävlingar anordnades under 2024 av förbundet?', ['38','46','44','53']],
    ['Hur många SM-finaler i Bugg har Benjamin Österlund och Angelica Källström inte vunnit sedan 2004?', ['0','3','1','2']],
    ['När var det senaste året dueller utfördes i juniorklassen?', ['2019','2021','2017','2018']],
    ['Vilket år bytte man från 2-minutersheat till 90-sekundersheat i Bugg?', ['2012','2008','2014','2002']],
    ['Var var SM 2008 i Bugg och Rock’n’Roll?', ['Enköping','Varberg','Karlstad','Örnsköldsvik']],
    ['Sätt rätt SM-vinnande par på rätt årtal.', []],
    ['Vilken klubb vann Lag-SM senast det avgjordes?', ['Borås','Mälar','Rocksulan','UBSS']],
    ['Vilken av artisterna är den enda som inte har spelats på en SM-final någonsin?', ['Diamantorkestern & Mikael Karlsson','Brian Setzer','Drake Milligan','Eddie Meduza']]
  ];
  const pairs = [['E','Henric Stillman & Joanna Stillman'],['C','Johan Haag & Hanna Kuplijen'],['I','Benjamin Österlund & Angelica Källström'],['G','Karl Letternström & Elizabeth Lindström'],['B','Jacob Berggren & Natalie Albrigtsen'],['F','Jesper Boberg & Sara Victorin'],['H','Andreas Larsson & Elizabeth Lindström']];
  const years = ['2005','2012','2013','2019','2025'];
  const escape = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const getClient = () => window.sb || window.supabaseClient || window.supabase?.client || null;
  let started = 0, timer = null, submitted = false;
  function mount() {
    const root = document.getElementById('quiz');
    if (!root || root.dataset.felixMounted) return;
    root.dataset.felixMounted = '1';
    root.innerHTML = `<div class="panel" style="max-width:850px;margin:auto"><h1>💃 Felix Bugg Quiz</h1><p>10 frågor om tävling, SM och buggens historia. Flest rätt vinner, snabbast tid avgör vid lika poäng.</p><div id="felixWelcome"><button class="btn gold" id="felixStart">Starta quiz</button></div><div id="felixPlay" hidden><p id="felixClock" aria-live="off">Tid: 0:00</p><form id="felixForm"></form></div><div id="felixResult" role="status"></div></div>`;
    root.querySelector('#felixStart').addEventListener('click', () => {
      if (started) return;
      started = Date.now();
      root.querySelector('#felixWelcome').hidden = true;
      root.querySelector('#felixPlay').hidden = false;
      const form = root.querySelector('#felixForm');
      form.innerHTML = questions.map(([question, choices], index) => {
        const n = index + 1;
        const controls = n === 8 ? years.map((year, j) => `<label style="display:block;margin:10px 0">${year} <select name="q8${'abcde'[j]}" required><option value="">Välj par</option>${pairs.map(([key, name]) => `<option value="${key}">${escape(name)}</option>`).join('')}</select></label>`).join('') : choices.map((choice, j) => `<label style="display:block;margin:9px 0"><input type="radio" name="q${n}" value="${'ABCD'[j]}" required> ${'ABCD'[j]}. ${escape(choice)}</label>`).join('');
        return `<fieldset style="border:1px solid #dbe4f0;border-radius:12px;margin:14px 0;padding:16px"><legend><strong>${n}. ${escape(question)}</strong></legend>${controls}</fieldset>`;
      }).join('') + '<button class="btn gold" type="submit">Skicka in svar</button>';
      timer = setInterval(() => { const s = Math.floor((Date.now() - started) / 1000); root.querySelector('#felixClock').textContent = `Tid: ${Math.floor(s / 60)}:${String(s % 60).padStart(2,'0')}`; }, 250);
      form.addEventListener('submit', async event => {
        event.preventDefault();
        if (submitted) return;
        const client = getClient();
        if (!client?.rpc) { root.querySelector('#felixResult').textContent = 'Quizet kan inte skickas in förrän databasanslutningen är klar.'; return; }
        submitted = true;
        const elapsed = Date.now() - started;
        const answers = Object.fromEntries(new FormData(form).entries());
        const { data, error } = await client.rpc('quiz_submit', { p_answers: answers, p_elapsed_ms: elapsed });
        if (error) { submitted = false; root.querySelector('#felixResult').textContent = 'Kunde inte spara resultatet: ' + error.message; return; }
        clearInterval(timer);
        form.hidden = true;
        const result = Array.isArray(data) ? data[0] : data;
        root.querySelector('#felixResult').textContent = `Du fick ${result.score} av 10 rätt! Tid: ${(result.elapsed_ms / 1000).toFixed(1)} sekunder.`;
      });
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount); else mount();
  window.mountFelixQuiz = mount;
})();