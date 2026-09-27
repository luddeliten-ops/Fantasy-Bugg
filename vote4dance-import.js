/* Admin-only backup import. The CSV importer in index.html is intentionally untouched. */
(() => {
  const $v = id => document.getElementById(id);
  let savedClasses = [];
  let preview = null;

  function status(message, error = false) {
    $v("v4dStatus").innerHTML = `<span class="${error ? "err" : "ok"}">${esc(message)}</span>`;
  }

  function selectedCompetition() {
    return competitions.find(c => String(c.id) === $v("resultCompetitionSelect").value);
  }

  function stageFromLabel(label) {
    const match = String(label || "").match(/^Bugg\s+(Junior|Vuxen|Senior)\s+([NABCD])(?:\b|\()/i);
    if (!match) return null;
    return { age: match[1][0].toUpperCase() + match[1].slice(1).toLowerCase(), stage: match[2].toUpperCase() };
  }

  function matchingPair(row, age) {
    const people = [normalizeName(row.name1), normalizeName(row.name2)];
    const exact = pairs.filter(p => p.cls === age &&
      (normalizeName(p.name) === people.join(" ") ||
       normalizeName(p.name) === people.slice().reverse().join(" ")));
    if (exact.length === 1) return exact[0];
    const probable = pairs.filter(p => p.cls === age &&
      people.every(person => person.split(" ").filter(Boolean).every(token =>
        normalizeName(p.name).split(" ").includes(token))));
    return probable.length === 1 ? probable[0] : null;
  }

  function calculatePreview() {
    const best = new Map();
    const power = { A: 5, B: 4, C: 3, D: 2, N: 1 };
    for (const source of savedClasses) {
      const cls = stageFromLabel(source.class_label);
      if (!cls) continue;
      for (const row of source.rows || []) {
        const names = [normalizeName(row.name1), normalizeName(row.name2)].sort();
        const key = `${cls.age}|${names.join("|")}`;
        const current = { ...row, ...cls, label: source.class_label, url: source.source_url };
        const old = best.get(key);
        if (!old || power[current.stage] > power[old.stage] ||
          (current.stage === old.stage && current.placement < old.placement)) best.set(key, current);
      }
    }
    const ranked = [];
    for (const age of ["Junior", "Vuxen", "Senior"]) {
      let offset = 0;
      for (const stage of ["A", "B", "C", "D", "N"]) {
        const list = [...best.values()].filter(x => x.age === age && x.stage === stage)
          .sort((a, b) => a.placement - b.placement ||
            `${a.name1} ${a.name2}`.localeCompare(`${b.name1} ${b.name2}`, "sv"));
        let oldPlace = null;
        let overall = 0;
        list.forEach((row, index) => {
          if (row.placement !== oldPlace) overall = offset + index + 1;
          oldPlace = row.placement;
          ranked.push({ ...row, overall, pair: matchingPair(row, age) });
        });
        offset += list.length;
      }
    }
    const entrants = {};
    ranked.forEach(row => { entrants[row.age] = (entrants[row.age] || 0) + 1; });
    const duplicatePairs = new Set();
    const usedPairs = new Set();
    ranked.filter(row => row.pair).forEach(row => {
      if (usedPairs.has(row.pair.index)) duplicatePairs.add(row.pair.index);
      usedPairs.add(row.pair.index);
    });
    return { ranked, entrants, duplicatePairs };
  }

  function render() {
    const host = $v("v4dClasses");
    if (!host) return;
    preview = calculatePreview();
    host.innerHTML = savedClasses.length ? savedClasses.map(c => `
      <div class="scoreRow v4dSourceRow">
        <div><b>${esc(c.class_label)}</b><div class="meta">${c.rows.length} par · Vote4Dance ${esc(c.source_competition_id)}</div></div>
        <a href="${esc(c.source_url)}" target="_blank" rel="noopener noreferrer">Visa källa</a>
      </div>`).join("") : `<div class="empty">Inga Vote4Dance-klasser sparade för denna tävling.</div>`;

    const { ranked, duplicatePairs } = preview;
    const unmatched = ranked.filter(row => !row.pair);
    $v("v4dPreview").innerHTML = ranked.length ? `
      <div class="notice">${savedClasses.length} klasser · ${ranked.length} unika par ·
        ${unmatched.length} utan matchning${duplicatePairs.size ? ` · ${duplicatePairs.size} dubbla parkort` : ""}.
        Lägg till alla aktuella klasser innan du publicerar poäng.</div>
      ${ranked.slice(0, 150).map(row => `<div class="scoreRow">
        <div><b>${esc(row.name1)} &amp; ${esc(row.name2)}</b><div class="meta">${esc(row.label)} · klassplacering ${row.placement}</div></div>
        <div>Plac ${row.overall}</div>
        <div>${row.pair ? `<span class="ok">Matchad</span>` : `<span class="err">Ej matchad</span>`}</div>
      </div>`).join("")}` : `<div class="empty">Lägg till en länk för att se paren.</div>`;
    $v("v4dPublish").disabled = !ranked.length || !!unmatched.length || !!duplicatePairs.size;
  }

  async function loadClasses() {
    savedClasses = [];
    render();
    const competition = selectedCompetition();
    if (!competition) return;
    const { data, error } = await sb.from("vote4dance_result_classes")
      .select("class_id,source_competition_id,class_label,source_url,rows,published_at")
      .eq("competition_id", competition.id).order("imported_at");
    if (error) return status(error.message, true);
    if (selectedCompetition()?.id !== competition.id) return;
    savedClasses = data || [];
    render();
  }

  async function addClass() {
    const competition = selectedCompetition();
    const url = $v("v4dUrl").value.trim();
    if (!competition || !url) return status("Välj tävling och klistra in klasslänken.", true);
    $v("v4dAdd").disabled = true;
    status("Hämtar den publicerade klassen …");
    try {
      const { data, error } = await sb.functions.invoke("vote4dance-results", { body: { url } });
      if (error || data?.error) throw new Error(data?.error || error?.message || "Hämtningen misslyckades.");
      const cls = stageFromLabel(data.class_label);
      if (!cls) throw new Error("Den här klassen ingår inte i Fantasy Buggs Junior, Vuxen eller Senior.");
      if (savedClasses.some(c => c.source_competition_id !== data.competition_id)) {
        throw new Error("Länken tillhör en annan Vote4Dance-tävling än de redan sparade klasserna.");
      }
      const { error: saveError } = await sb.from("vote4dance_result_classes").upsert({
        competition_id: competition.id,
        class_id: data.class_id,
        source_competition_id: data.competition_id,
        class_label: data.class_label,
        source_url: data.url,
        rows: data.rows,
        imported_at: new Date().toISOString(),
        published_at: savedClasses.find(c => c.class_id === data.class_id)?.published_at || null,
      }, { onConflict: "competition_id,class_id" });
      if (saveError) throw saveError;
      $v("v4dUrl").value = "";
      await loadClasses();
      status(`${data.class_label}: ${data.rows.length} par sparade. Fler klasslänkar kan läggas till samma tävling.`);
    } catch (error) {
      status(error?.message || "Klassen kunde inte hämtas.", true);
    } finally {
      $v("v4dAdd").disabled = false;
    }
  }

  async function publish() {
    const competition = selectedCompetition();
    if (!competition || !preview?.ranked.length) return;
    if (preview.ranked.some(row => !row.pair) || preview.duplicatePairs.size) {
      return status("Lös par som inte matchats eller dubbla parkort före publicering.", true);
    }
    if (!confirm(`Publicera ${preview.ranked.length} par från ${savedClasses.length} klasser för ${competition.name}? Kontrollera att alla aktuella klasser är sparade.`)) return;
    const rows = preview.ranked.map(row => ({
      pair_index: row.pair.index,
      pair_name: row.pair.name,
      placement: row.overall,
      fantasy_points: calculateFantasyPoints(row.overall,
        preview.entrants[row.age], competition.level, row.pair.price),
    }));
    $v("v4dPublish").disabled = true;
    status("Publicerar och räknar poäng …");
    try {
      const { error } = await sb.rpc("publish_vote4dance_results", {
        p_competition_id: competition.id,
        p_rows: rows,
      });
      if (error) throw error;
      competition.results_imported_at = new Date().toISOString();
      await Promise.allSettled([loadPairHistory(), loadFantasyTotal(), loadGlobalLeaderboard()]);
      await loadClasses();
      status(`Publicerat ${rows.length} par från ${savedClasses.length} klasser för ${competition.name}.`);
    } catch (error) {
      status(error?.message || "Publiceringen misslyckades.", true);
    } finally {
      render();
    }
  }

  function init() {
    if (!$v("v4dAdd")) return;
    $v("v4dAdd").addEventListener("click", addClass);
    $v("v4dPublish").addEventListener("click", publish);
    $v("resultCompetitionSelect").addEventListener("change", loadClasses);
    render();
  }
  init();
})();
