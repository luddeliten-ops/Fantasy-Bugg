import { createClient } from "npm:@supabase/supabase-js@2.57.0";
import { io } from "npm:socket.io-client@4.8.4";

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

  const socket = io("https://api.vote4dance.com/", {
    query: { "connect.sid": decodeURIComponent(session) },
    transports: ["websocket", "polling"],
    tryAllTransports: true,
    reconnection: false,
    timeout: 12000,
  });

  try {
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("Vote4Dance svarade inte i tid.")), 15000);
      socket.once("connect", () => { clearTimeout(timer); resolve(); });
      socket.once("connect_error", (error: Error) => { clearTimeout(timer); reject(error); });
    });

    const read = <T>(path: string) => new Promise<T>((resolve, reject) => {
      socket.timeout(16000).emit("stream", { url: path },
        (timeout: Error | null, error: { message?: string } | null, response: { data: T }) => {
          if (timeout || error || !response) reject(new Error(error?.message || "Vote4Dance svarade inte."));
          else resolve(response.data);
        });
    });

    const rounds = (await read<Round[]>(`/class-rounds/${classId}`))
      .filter(round => round.round_type === "normal");
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
    const final = rounds.at(-1)!;
    if (!/final/i.test(final.round_label) ||
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
    socket.disconnect();
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
