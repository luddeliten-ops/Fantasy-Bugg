/* Admin-only backup import. The CSV importer in index.html is intentionally untouched. */
(() => {
  const $v = id => document.getElementById(id);
  let savedClasses = [];
  let preview = null;
  let editingKey = null;
  let editingClass = null;

  function status(message, error = false) {
    $v("v4dStatus").innerHTML = `<span class="${error ? "err" : "ok"}">${esc(message)}</span>`;
  }

  function selectedCompetition() {
    return competitions.find(c => String(c.id) === $v("resultCompetitionSelect").value);
  }

  function stageFromLabel(label) {
    const name = String(label || "").trim();
    const district = name.match(/^Bugg\s+(JDM|SDM|DM)(?:\b|\()/i);
    if (district) return { age: { JDM: "Junior", SDM: "Senior", DM: "Vuxen" }[district[1].toUpperCase()], stage: "A" };
    const match = name.match(/^Bugg\s+(Junior|Vuxen|Senior)\s+([NABCD])(?:\b|\()/i);
    if (!match) return null;
    return { age: match[1][0].toUpperCase() + match[1].slice(1).toLowerCase(), stage: match[2].toUpperCase() };
  }

  function matchingPair(row, age) {
    if (row.manual_pair_name) {
      return pairs.find(p => p.cls === (row.manual_pair_class || age) && p.index === row.manual_pair_index &&
        p.name === row.manual_pair_name) || null;
    }
    // Namnbyte: Linn Carlsson tävlar på samma parkort som Linn Gustafsson.
    // Matcha båda personerna och klassen så att inget annat Modin-par påverkas.
    const entrants = [normalizeName(row.name1), normalizeName(row.name2)].sort();
    if (age === "Senior" &&
        entrants.join("|") === ["thomas modin", "linn carlsson"].sort().join("|")) {
      return pairs.find(p => p.index === 165 && p.cls === "Senior" &&
        normalizeName(p.name) === "thomas modin linn gustafsson") || null;
    }
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

  function pairKey(row, age) {
    return `${age}|${[normalizeName(row.name1), normalizeName(row.name2)].sort().join("|")}`;
  }

  function pairOptions(age, query = "") {
    const words = normalizeName(query).split(" ").filter(Boolean);
    return pairs.filter(p => p.cls === age &&
      words.every(word => normalizeName(p.name).includes(word)))
      .sort((a, b) => a.name.localeCompare(b.name, "sv"))
      .map(p => `<option value="${p.index}">${esc(p.name)}${p.club ? ` · ${esc(p.club)}` : ""}</option>`).join("");
  }

  function calculatePreview() {
    const best = new Map();
    const power = { A: 5, B: 4, C: 3, D: 2, N: 1 };
    for (const source of savedClasses) {
      const cls = stageFromLabel(source.class_label);
      if (!cls) continue;
      for (const row of source.rows || []) {
        const key = pairKey(row, cls.age);
        const current = { ...row, ...cls, key, label: source.class_label, url: source.source_url };
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
        <div><a href="${esc(c.source_url)}" target="_blank" rel="noopener noreferrer">Visa källa</a>
        ${c.published_at ? "" : `<button class="btn soft" type="button" data-v4d-remove="${esc(c.class_id)}">Ta bort</button>`}</div>
      </div>`).join("") : `<div class="empty">Inga Vote4Dance-klasser sparade för denna tävling.</div>`;

    const { ranked, duplicatePairs } = preview;
    const unmatched = ranked.filter(row => !row.pair);
    const displayed = [...unmatched, ...ranked.filter(row => row.pair)];
    $v("v4dPreview").innerHTML = ranked.length ? `
      <div class="notice">${savedClasses.length} klasser · ${ranked.length} unika par ·
        ${unmatched.length} utan matchning${duplicatePairs.size ? ` · ${duplicatePairs.size} dubbla parkort` : ""}.
        ${unmatched.length ? "Par utan parkort räknas med i placeringarna men får inga egna fantasypoäng. Matcha namnbyten innan du publicerar." : ""}
        Kontrollera att alla aktuella klasser är sparade innan du publicerar.</div>
      ${displayed.map(row => `<div class="scoreRow v4dPairRow">
        <div><b>${esc(row.name1)} &amp; ${esc(row.name2)}</b><div class="meta">${esc(row.label)} · klassplacering ${row.placement}</div></div>
        <div>Plac ${row.overall} av ${preview.entrants[row.age]} i ${esc(row.age)}</div>
        <div>${row.pair ? `<span class="ok">${esc(row.pair.name)}${row.pair.cls !== row.age ? ` · parkort ${esc(row.pair.cls)}` : ""}</span>` : `<span class="err">Ej matchad</span>`}
          <button class="btn soft" type="button" data-v4d-match="${esc(row.key)}">${row.pair ? "Ändra" : "Välj par"}</button></div>
        ${editingKey === row.key ? `<div class="v4dMatchEditor">
          <div class="meta">Tävlingsklass: ${esc(row.age)}. Välj parkortets nuvarande klass. När du sparar flyttas parkortet till ${esc(row.age)} i hela Fantasy Bugg, med samma pris och parkorts-ID.</div>
          <label>Parkortets åldersklass<select class="search" data-v4d-class aria-label="Parkortets åldersklass">
            ${["Junior", "Vuxen", "Senior"].map(age => `<option value="${age}"${age === editingClass ? " selected" : ""}>${age}</option>`).join("")}
          </select></label>
          <label>Sök parkort<input class="search" type="search" data-v4d-search placeholder="Sök namn på paret" autocomplete="off"></label>
          <select class="search" data-v4d-choice size="7" aria-label="Välj parkort"><option value="">Välj ett par</option>${pairOptions(editingClass || row.age)}</select>
          <div class="v4dMatchActions"><button class="btn blue" type="button" data-v4d-save="${esc(row.key)}">Spara matchning och klass</button>
          ${row.manual_pair_name ? `<button class="btn soft" type="button" data-v4d-reset="${esc(row.key)}">Återställ automatisk matchning</button>` : ""}
          <button class="btn soft" type="button" data-v4d-cancel>Avbryt</button></div>
        </div>` : ""}
      </div>`).join("")}` : `<div class="empty">Lägg till en länk för att se paren.</div>`;
    const mixedSources = new Set(savedClasses.map(c => c.source_competition_id)).size > 1;
    if (mixedSources) $v("v4dPreview").insertAdjacentHTML("afterbegin",
      `<div class="err">Klasserna kommer från olika Vote4Dance-tävlingar. Publicera inte dessa tillsammans.</div>`);
    $v("v4dPublish").disabled = !ranked.some(row => row.pair) ||
      !!duplicatePairs.size || mixedSources;
  }

  async function loadClasses() {
    editingKey = null;
    editingClass = null;
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
      if (error || data?.error) {
        let detail = data?.error;
        if (!detail && error?.context?.json) {
          try { detail = (await error.context.json())?.error; } catch (_) {}
        }
        throw new Error(detail || error?.message || "Hämtningen misslyckades.");
      }
      const cls = stageFromLabel(data.class_label);
      if (!cls) throw new Error("Klassen stöds inte. Använd Bugg Junior/Vuxen/Senior eller Bugg JDM/DM/SDM.");
      if (savedClasses.some(c => c.source_competition_id !== data.competition_id)) {
        throw new Error("Länken tillhör en annan Vote4Dance-tävling än de redan sparade klasserna.");
      }
      const { error: saveError } = await sb.from("vote4dance_result_classes").upsert({
        competition_id: competition.id,
        class_id: data.class_id,
        source_competition_id: data.competition_id,
        class_label: data.class_label,
        source_url: data.url,
        rows: data.rows.map(row => {
          const old = savedClasses.find(c => c.class_id === data.class_id)?.rows
            ?.find(previous => String(previous.team_id) === String(row.team_id));
          return old?.manual_pair_name ? { ...row, manual_pair_index: old.manual_pair_index,
            manual_pair_name: old.manual_pair_name, manual_pair_class: old.manual_pair_class || cls.age } : row;
        }),
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

  async function saveMatching(key, pairIndex, pairClass) {
    const competition = selectedCompetition();
    const row = preview?.ranked.find(item => item.key === key);
    const chosen = pairs.find(p => p.index === pairIndex && p.cls === pairClass);
    if (!competition || !row || !chosen) return status("Välj ett parkort i den valda åldersklassen.", true);
    if (preview.ranked.some(other => other.key !== key && other.pair?.index === chosen.index)) {
      return status("Parkortet är redan kopplat till ett annat resultat i tävlingen.", true);
    }
    if (chosen.cls !== row.age && !confirm(`Flytta parkortet ${chosen.name} från ${chosen.cls} till ${row.age} i hela Fantasy Bugg? Parkorts-ID och pris behålls.`)) return;
    const affected = savedClasses.filter(source => {
      const cls = stageFromLabel(source.class_label);
      return cls && source.rows.some(item => pairKey(item, cls.age) === key);
    });
    if (!affected.length) return status("Resultatraden kunde inte hittas.", true);
    $v("v4dPreview").querySelectorAll("[data-v4d-save]").forEach(button => { button.disabled = true; });
    try {
      const updates = affected.map(source => {
        const cls = stageFromLabel(source.class_label);
        const rows = source.rows.map(item => pairKey(item, cls.age) === key
          ? { ...item, manual_pair_index: chosen.index, manual_pair_name: chosen.name,
            manual_pair_class: row.age } : item);
        return { class_id: source.class_id, rows };
      });
      const { error } = await sb.rpc("match_vote4dance_pair_and_class", {
        p_competition_id: competition.id,
        p_updates: updates,
        p_pair_index: chosen.index,
        p_pair_name: chosen.name,
        p_pair_class: row.age,
      });
      if (error) throw error;
      chosen.cls = row.age;
      renderMarket();
      renderTeam();
      renderAdminMarketPairs();
      await loadClasses();
      status(`${row.name1} & ${row.name2} kopplades till ${chosen.name}. Parkortet ligger nu i ${row.age}.`);
    } catch (error) {
      await loadClasses();
      status(error?.message || "Matchningen kunde inte sparas.", true);
    }
  }

  async function resetMatching(key) {
    const competition = selectedCompetition();
    if (!competition) return;
    const affected = savedClasses.filter(source => {
      const cls = stageFromLabel(source.class_label);
      return cls && source.rows.some(item => pairKey(item, cls.age) === key && item.manual_pair_name);
    });
    try {
      for (const source of affected) {
        const cls = stageFromLabel(source.class_label);
        const rows = source.rows.map(item => {
          if (pairKey(item, cls.age) !== key) return item;
          const { manual_pair_index, manual_pair_name, manual_pair_class, ...plain } = item;
          return plain;
        });
        const { error } = await sb.from("vote4dance_result_classes")
          .update({ rows }).eq("competition_id", competition.id).eq("class_id", source.class_id);
        if (error) throw error;
        source.rows = rows;
      }
      await loadClasses();
      status("Den manuella matchningen återställdes.");
    } catch (error) {
      await loadClasses();
      status(error?.message || "Matchningen kunde inte återställas.", true);
    }
  }

  async function removeClass(classId) {
    const competition = selectedCompetition();
    const source = savedClasses.find(c => c.class_id === classId);
    if (!competition || !source || source.published_at ||
        !confirm(`Ta bort den sparade klassen ${source.class_label}?`)) return;
    const { error } = await sb.from("vote4dance_result_classes").delete()
      .eq("competition_id", competition.id).eq("class_id", classId);
    if (error) return status(error.message, true);
    await loadClasses();
    status(`${source.class_label} togs bort från den opublicerade importen.`);
  }

  async function publish() {
    const competition = selectedCompetition();
    if (!competition || !preview?.ranked.length) return;
    if (!preview.ranked.some(row => row.pair) || preview.duplicatePairs.size ||
        new Set(savedClasses.map(c => c.source_competition_id)).size > 1) {
      return status("Minst ett parkort måste vara matchat och inga dubbla parkort får finnas.", true);
    }
    const matched = preview.ranked.filter(row => row.pair);
    const missing = preview.ranked.length - matched.length;
    if (!confirm(`Publicera poäng för ${matched.length} matchade parkort från ${savedClasses.length} klasser för ${competition.name}? ${missing} tävlande par utan parkort räknas med i placeringarna men får inga egna fantasypoäng. Kontrollera namnbyten och att alla aktuella klasser är sparade.`)) return;
    const rows = matched.map(row => ({
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
      status(`Publicerat poäng för ${rows.length} parkort från ${savedClasses.length} klasser för ${competition.name}. ${missing} tävlande par saknade parkort.`);
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
    $v("v4dClasses").addEventListener("click", event => {
      const button = event.target.closest("[data-v4d-remove]");
      if (button) removeClass(button.dataset.v4dRemove);
    });
    $v("v4dPreview").addEventListener("click", event => {
      const match = event.target.closest("[data-v4d-match]");
      if (match) {
        editingKey = match.dataset.v4dMatch;
        const row = preview?.ranked.find(item => item.key === editingKey);
        editingClass = row?.pair?.cls || row?.age || "Vuxen";
        render();
        $v("v4dPreview").querySelector("[data-v4d-search]")?.focus();
      }
      const save = event.target.closest("[data-v4d-save]");
      if (save) saveMatching(save.dataset.v4dSave,
        Number($v("v4dPreview").querySelector("[data-v4d-choice]")?.value), editingClass);
      const reset = event.target.closest("[data-v4d-reset]");
      if (reset) resetMatching(reset.dataset.v4dReset);
      if (event.target.closest("[data-v4d-cancel]")) { editingKey = null; render(); }
    });
    $v("v4dPreview").addEventListener("input", event => {
      if (!event.target.matches("[data-v4d-search]")) return;
      const choice = $v("v4dPreview").querySelector("[data-v4d-choice]");
      if (choice) choice.innerHTML = `<option value="">Välj ett par</option>${pairOptions(editingClass, event.target.value)}`;
    });
    $v("v4dPreview").addEventListener("change", event => {
      if (!event.target.matches("[data-v4d-class]")) return;
      editingClass = event.target.value;
      const choice = $v("v4dPreview").querySelector("[data-v4d-choice]");
      const query = $v("v4dPreview").querySelector("[data-v4d-search]")?.value || "";
      if (choice) choice.innerHTML = `<option value="">Välj ett par</option>${pairOptions(editingClass, query)}`;
    });
    $v("resultCompetitionSelect").addEventListener("change", loadClasses);
    document.addEventListener("fantasy:pairs-loaded", render);
    render();
  }
  init();
})();
