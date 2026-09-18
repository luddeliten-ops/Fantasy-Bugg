/* Felix Bugg Quiz. Mounts inside #quiz. Requires quiz-schema.sql. */
(() => {
  const questions = [
    ['Hur många av personerna i årets SM-final har tidigare vunnit ett SM-guld i någon form?', ['9','10','14','11']],
    ['Vilken låt har spelats flest gånger i en SM-final någonsin?', ['Farväl Goodbye – Lasse Stefanz','Yea Yea Yea – Fernandoz','Våga Stuffa – Stefan Borsch','Dra dit pepparn växer – Sten & Stanley']],
    ['Hur många tävlingar anordnades under 2024 av förbundet?', ['38','46','44','53']],
    ['Hur många SM-finaler i slow har Benjamin Österlund och Angelica Källström inte vunnit sedan 2004?', ['0','3','1','2']],
    ['När var det senaste året dueller utfördes i juniorklassen?', ['2019','2021','2017','2018']],
    ['Vilket år bytte man från 2-minutersheat till 90-sekundersheat i Bugg?', ['2012','2008','2014','2002']],
    ['Var var SM 2008 i Bugg och Rock’n’Roll?', ['Enköping','Varberg','Karlstad','Örnsköldsvik']],
    ['Sätt rätt SM-vinnande par på rätt årtal.', []],
    ['Vilken klubb vann Lag-SM senast det avgjordes?', ['Borås','Mälar','Rocksulan','UBSS']],
    ['Vilken av artisterna är den enda som inte har spelats på en SM-final någonsin?', ['Diamantorkestern & Mikael Karlsson','Brian Setzer','Drake Milligan','Eddie Meduza']]
  ];
  const pairs = [['E','Henric Stillman & Joanna Stillman'],['C','Johan Haag & Hanna Kuplijen'],['I','Benjamin Österlund & Angelica Källström'],['G','Karl Letternström & Elizabeth Lindström'],['B','Jacob Berggren & Natalie Albrigtsen'],['F','Jesper Boberg & Sara Victorin'],['H','Andreas Larsson & Elizabeth Lindström']];
  const years = ['2005','2012','2013','2019','2025'];
  // Facit och förklaringar från Felix svarsdokument. Endast synligt i gränssnittet efter inskickat försök.
  const explanations = [
    ['11 personer','Enligt Felix sammanställning av årets SM-finalister har bland andra Conrad och Cajsa, Jacob och Natalie samt Benjamin och Angelica flera SM-guld. Fanny har guld i dubbelbugg, medan Hampus saknar SM-guld. Fabian och Zara har inga SM-guld.'],
    ['Våga Stuffa – Stefan Borsch','Låten spelades i vuxen snabb i SM-finalerna 1991, 1994, 1996 och 2021. Farväl Goodbye med Lasse Stefanz spelades enligt sammanställningen i tre finaler: 2011, 2024 och juniorfinalen 2026.'],
    ['44 tävlingar','45 tävlingar var ursprungligen planerade 2024. När Jönköpingstrofén ställdes in återstod 44 genomförda tävlingar.'],
    ['2 finaler','Enligt Felix underlag vann Benjamin och Angelica inte slowfinalerna 2020 och 2023: 2020 ställdes tävlingen in och 2023 deltog de inte.'],
    ['2018','Senaste gången juniorklassen hade dueller var enligt underlaget i Skövde 2018, där Eric och Lycke Chadell vann klassen.'],
    ['2012','År 2012 ändrades heaten från två minuter till 90 sekunder.'],
    ['Enköping','SM 2008 arrangerades i Enköpings idrottshus. Karlstad arrangerade 2009, Örnsköldsvik 2007 och Varberg 2006.'],
    ['2005 – Henric & Joanna Stillman; 2012 – Johan Haag & Hanna Kuplijen; 2013 – Benjamin Österlund & Angelica Källström; 2019 – Karl Letternström & Elizabeth Lindström; 2025 – Jacob Berggren & Natalie Albrigtsen','Samtliga fem årtal måste matchas med rätt par för att ge en poäng.'],
    ['Borås','Enligt Felix underlag avgjordes Lag-SM senast 2018 i Skellefteå, då Borås Dansförening vann.'],
    ['Eddie Meduza','Diamantorkestern och Mikael Karlsson spelades 2018 med Bloodshot Eyes. Brian Setzers Blue Café spelades 2005. Drake Milligans Sounds Like Something I Do spelades i juniorfinalen 2022, då det blev omdans. Enligt Felix underlag har Eddie Meduza inte spelats i någon SM-final; Yea Yea Yea har däremot spelats i Fernandoz version.']
  ];
  const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const client = () => typeof sb !== 'undefined' ? sb : null;
  let started = 0, timer, submitting = false;
  const duration = ms => `${Math.floor((ms || 0) / 60000)}:${String(Math.floor((ms || 0) / 1000) % 60).padStart(2,'0')}`;
  function showAnswers(root) {
    const target = root.querySelector('#felixAnswers');
    if (!target) return;
    target.hidden = false;
    target.innerHTML = '<h2>📖 Rätta svar och förklaringar</h2>' + explanations.map(([answer, explanation], i) => `<section style="border:1px solid #dbe4f0;border-radius:12px;margin:12px 0;padding:14px"><h3 style="margin:0 0 8px">Fråga ${i + 1}: ${esc(questions[i][0])}</h3><p><strong>Rätt svar:</strong> ${esc(answer)}</p><p>${esc(explanation)}</p></section>`).join('') + '<p><small>Facit och förklaringar: Felix Friedman.</small></p>';
  }
  function mount() {
    const root = document.getElementById('quiz');
    if (!root || root.dataset.felixMounted) return;
    root.dataset.felixMounted = '1';
    root.innerHTML = '<div class="panel" style="max-width:850px;margin:auto"><h1>💃 Felix Bugg Quiz</h1><p>10 frågor om tävling, SM och buggens historia. Flest rätt vinner, snabbast tid avgör vid lika poäng.</p><p><strong>🏆 Priser:</strong> De som slutar på pallplats (plats 1–3) i tävlingen vinner fantasypoäng!</p><p style="padding:12px 14px;border:2px solid #d6a83e;border-radius:10px"><strong>⏰ Tävlingen om fantasypoäng avslutas lördag 26 september 2026 kl. 23.59.</strong><br>Quizet finns kvar och går att spela även efter att tävlingen avslutats, men senare resultat deltar inte i tävlingen om fantasypoäng.</p><div id="felixWelcome"><button class="btn gold" id="felixStart">Starta quiz</button></div><div id="felixPlay" hidden><p id="felixClock">Tid: 0:00</p><form id="felixForm"></form></div><div id="felixResult" role="status"></div><div id="felixAnswers" hidden></div></div>';
    const status = root.querySelector('#felixResult');
    root.querySelector('#felixStart').addEventListener('click', async () => {
      const db = client();
      if (!db) { status.textContent = 'Databasanslutningen saknas.'; return; }
      const {data, error} = await db.rpc('quiz_start');
      if (error) { status.textContent = 'Kunde inte starta quizet: ' + error.message; return; }
      if (data.submitted) { status.textContent = `Du har redan deltagit. ${data.score} av 10 rätt. Tid: ${duration(data.elapsed_ms)}.`; root.querySelector('#felixWelcome').hidden = true; showAnswers(root); return; }
      status.textContent = '';
      started = Date.now();
      root.querySelector('#felixWelcome').hidden = true;
      root.querySelector('#felixPlay').hidden = false;
      const form = root.querySelector('#felixForm');
      form.innerHTML = questions.map(([question, choices], index) => {
        const n = index + 1;
        const controls = n === 8 ? years.map((year, j) => `<label style="display:block;margin:10px 0">${year} <select name="q8${'abcde'[j]}" required><option value="">Välj par</option>${pairs.map(([key, name]) => `<option value="${key}">${esc(name)}</option>`).join('')}</select></label>`).join('') : choices.map((choice, j) => `<label style="display:block;margin:9px 0"><input type="radio" name="q${n}" value="${'ABCD'[j]}" required> ${'ABCD'[j]}. ${esc(choice)}</label>`).join('');
        return `<fieldset style="border:1px solid #dbe4f0;border-radius:12px;margin:14px 0;padding:16px"><legend><strong>${n}. ${esc(question)}</strong></legend>${controls}</fieldset>`;
      }).join('') + '<button class="btn gold" type="submit">Skicka in svar</button>';
      timer = setInterval(() => root.querySelector('#felixClock').textContent = `Tid: ${duration(Date.now() - started)}`, 250);
      form.addEventListener('submit', async event => {
        event.preventDefault();
        if (submitting) return;
        submitting = true;
        const answers = Object.fromEntries(new FormData(form).entries());
        const {data: result, error: submitError} = await db.rpc('quiz_submit', {p_answers: answers, p_elapsed_ms: Date.now() - started});
        if (submitError) { submitting = false; status.textContent = 'Kunde inte spara resultatet: ' + submitError.message; return; }
        clearInterval(timer);
        root.querySelector('#felixPlay').hidden = true;
        status.textContent = `Du fick ${result.score} av 10 rätt! Tid: ${duration(result.elapsed_ms)}.`;
        showAnswers(root);
      });
    });
  }
  window.mountFelixQuiz = mount;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount); else mount();
})();