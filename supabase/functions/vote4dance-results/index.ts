import { createClient } from "npm:@supabase/supabase-js@2.57.0";

const cors = {
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const corsFor = (request: Request) => ({
  ...cors,
  "Access-Control-Allow-Origin": ["https://fantasybugg.se", "https://www.fantasybugg.se"]
    .includes(request.headers.get("Origin") || "") ? request.headers.get("Origin")! : "https://fantasybugg.se",
  Vary: "Origin",
});

const json = (request: Request, value: unknown, status = 200) => new Response(JSON.stringify(value), {
  status,
  headers: { ...corsFor(request), "Content-Type": "application/json", "Cache-Control": "no-store" },
});

type Round = {
  round_id: string;
  competition_id: string;
  class_id: string;
  class_label: string;
  round_label: string;
  round_type: string;
  round_parent_id: string;
  round_status: string;
  round_published: number;
};

type Team = {
  team_id: string;
  team_start_number: number;
  team_name_1: string;
  team_name_2: string;
  heats_team_placement: number;
  team_cancelled: number;
};

async function getPublishedClass(classId: string, url: string) {
  const tokenResponse = await fetch("https://api.vote4dance.com/token", {
    signal: AbortSignal.timeout(12000),
  });
  if (!tokenResponse.ok) throw new Error("Vote4Dance kunde inte öppnas.");
  const session = tokenResponse.headers.get("set-cookie")?.match(/connect\.sid=([^;]+)/)?.[1];
  if (!session) throw new Error("Vote4Dance gav ingen publik session.");

  // Vote4Dance uses Socket.IO over Engine.IO v4. Use the native WebSocket so
  // the Edge runtime does not depend on Node's unsupported ClientRequest hooks.
  const socket = new WebSocket(
    `wss://api.vote4dance.com/socket.io/?EIO=4&transport=websocket&connect.sid=${encodeURIComponent(decodeURIComponent(session))}`,
  );
  let nextId = 0;
  const pending = new Map<number, {
    resolve: (value: unknown) => void;
    reject: (reason: Error) => void;
    timer: number;
  }>();
  let connected = false;
  let settleConnection: ((error?: Error) => void) | null = null;
  const fail = (error: Error) => {
    settleConnection?.(error);
    settleConnection = null;
    for (const [id, request] of pending) {
      clearTimeout(request.timer);
      request.reject(error);
      pending.delete(id);
    }
  };
  socket.onmessage = event => {
    const frame = String(event.data);
    if (frame.startsWith("0")) socket.send("40");
    else if (frame === "2") socket.send("3");
    else if (frame.startsWith("40")) {
      connected = true;
      settleConnection?.();
      settleConnection = null;
    } else if (frame.startsWith("43")) {
      const match = frame.match(/^43(\d+)(\[.*\])$/s);
      if (!match) return;
      const id = Number(match[1]);
      const request = pending.get(id);
      if (!request) return;
      pending.delete(id);
      clearTimeout(request.timer);
      try {
        const [error, response] = JSON.parse(match[2]);
        if (error || !response) request.reject(new Error(error?.message || "Vote4Dance svarade inte."));
        else request.resolve(response.data);
      } catch (error) {
        request.reject(error instanceof Error ? error : new Error("Ogiltigt Vote4Dance-svar."));
      }
    } else if (frame.startsWith("44")) fail(new Error("Vote4Dance nekade anslutningen."));
  };
  socket.onerror = () => fail(new Error("WebSocket till Vote4Dance misslyckades."));
  socket.onclose = () => {
    if (connected || settleConnection) fail(new Error("Vote4Dance stängde anslutningen."));
  };

  try {
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => {
        settleConnection = null;
        reject(new Error("Vote4Dance svarade inte i tid."));
      }, 15000);
      settleConnection = error => {
        clearTimeout(timer);
        if (error) reject(error);
        else resolve();
      };
    });

    const read = <T>(path: string) => new Promise<T>((resolve, reject) => {
      const id = nextId++;
      const timer = setTimeout(() => {
        pending.delete(id);
        reject(new Error("Vote4Dance svarade inte i tid."));
      }, 16000);
      pending.set(id, { resolve: value => resolve(value as T), reject, timer });
      socket.send(`42${id}${JSON.stringify(["stream", { url: path }])}`);
    });

    const rounds = (await read<Round[]>(`/class-rounds/${classId}`))
      .filter(round => round.round_type === "normal" && String(round.round_parent_id) === "0");
    if (!rounds.length || rounds.some(round => String(round.class_id) !== classId)) {
      throw new Error("Länken innehåller ingen giltig klass.");
    }
    const competitionId = String(rounds[0].competition_id);
    const pageCompetitionId = new URL(url).pathname.match(/\/comp\/(\d+)\//)?.[1];
    const eventId = new URL(url).pathname.match(/\/event\/(\d+)\//)?.[1];
    if (rounds.some(round => String(round.competition_id) !== competitionId) ||
        (pageCompetitionId !== competitionId && pageCompetitionId !== eventId)) {
      throw new Error("Länkens tävling stämmer inte med resultatet.");
    }
    const final = rounds.find(round => /^final$/i.test(round.round_label.trim()));
    if (!final ||
        rounds.some(round => round.round_status !== "confirmed" || Number(round.round_published) !== 1)) {
      throw new Error("Klassen är inte färdig och publicerad ännu.");
    }

    const byTeam = new Map<string, Team>();
    for (const round of rounds) {
      const teams = await read<Team[]>(`/teamround/${round.round_id}`);
      if (!Array.isArray(teams) || !teams.length) throw new Error("En omgång saknar resultat.");
      for (const team of teams) {
        if (Number(team.team_cancelled)) continue;
        byTeam.set(String(team.team_id), team);
      }
    }
    const rows = [...byTeam.values()].map(team => ({
      team_id: String(team.team_id),
      start_number: Number(team.team_start_number),
      name1: String(team.team_name_1 || "").trim(),
      name2: String(team.team_name_2 || "").trim(),
      placement: Number(team.heats_team_placement),
    })).sort((a, b) => a.placement - b.placement || a.start_number - b.start_number);
    if (!rows.length || rows.some(row => !row.name1 || !row.name2 ||
      !Number.isInteger(row.placement) || row.placement < 1)) {
      throw new Error("Alla par har ännu inte en giltig placering.");
    }

    return { class_id: classId, competition_id: competitionId,
      class_label: rounds[0].class_label, url, rows };
  } finally {
    socket.close();
  }
}

Deno.serve(async request => {
  if (request.method === "OPTIONS") return new Response(null, { headers: corsFor(request) });
  if (request.method !== "POST") return json(request, { error: "Endast POST stöds." }, 405);
  try {
    const authorization = request.headers.get("Authorization");
    if (!authorization?.startsWith("Bearer ")) return json(request, { error: "Logga in som admin." }, 401);
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authorization } },
    });
    const { data: user, error: userError } = await supabase.auth.getUser(authorization.slice(7));
    if (userError || !user.user) return json(request, { error: "Logga in som admin." }, 401);
    const { data: admin, error: adminError } = await supabase.rpc("is_fantasy_admin");
    if (adminError || !admin) return json(request, { error: "Endast admin kan hämta resultat." }, 403);

    const body = await request.json();
    const url = new URL(String(body?.url || ""));
    if (!["vote4dance.com", "www.vote4dance.com"].includes(url.hostname) ||
      url.protocol !== "https:" || url.username || url.password ||
      !/^\/public\/event\/\d+\/comp\/\d+\/results\/\d+\/?$/.test(url.pathname)) {
      return json(request, { error: "Klistra in länken till en Vote4Dance-resultatklass." }, 400);
    }
    const classId = url.pathname.match(/\/results\/(\d+)/)![1];
    return json(request, await getPublishedClass(classId, url.href));
  } catch (error) {
    return json(request, { error: error instanceof Error ? error.message : "Resultatet kunde inte hämtas." }, 422);
  }
});
