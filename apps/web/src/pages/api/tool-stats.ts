import type { APIRoute } from 'astro';
import { tools } from '../../lib/tools';
import { kvCommand, kvEnabled, kvPipeline } from '../../lib/kv';

export const prerender = false;

const toolMap = new Map(tools.map((tool) => [tool.id, tool]));

const normalizeNumber = (value: unknown) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
};

const parseTopList = (raw: unknown) => {
  if (!Array.isArray(raw)) return [];

  const result: Array<{ id: string; score: number }> = [];
  for (let i = 0; i < raw.length; i += 2) {
    const id = String(raw[i] ?? '');
    const score = normalizeNumber(raw[i + 1]);
    if (id && toolMap.has(id)) {
      result.push({ id, score });
    }
  }
  return result;
};

const parseTotals = (results: Array<{ result: unknown }> | null | undefined, offset = 0) => ({
  views: normalizeNumber(results?.[offset]?.result),
  uses: normalizeNumber(results?.[offset + 1]?.result),
  uniques: normalizeNumber(results?.[offset + 2]?.result)
});

export const GET: APIRoute = async () => {
  if (!kvEnabled) {
    return new Response(JSON.stringify({ enabled: false, top: [] }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=0, s-maxage=60, stale-while-revalidate=300'
      }
    });
  }

  const totalsCommands: Array<[string, ...Array<string | number>]> = [
    ['GET', 'tools:total:views'],
    ['GET', 'tools:total:uses'],
    ['SCARD', 'tools:unique:30d']
  ];

  let basis: 'uses' | 'views' = 'uses';
  let topResponse = await kvCommand<Array<string>>(
    'ZREVRANGE',
    'tools:rank:uses',
    0,
    2,
    'WITHSCORES'
  );
  let topList = parseTopList(topResponse?.result);

  if (!topList.length) {
    basis = 'views';
    topResponse = await kvCommand<Array<string>>(
      'ZREVRANGE',
      'tools:rank:views',
      0,
      2,
      'WITHSCORES'
    );
    topList = parseTopList(topResponse?.result);
  }

  if (!topList.length) {
    const totalResults = await kvPipeline(totalsCommands);
    const totals = parseTotals(totalResults);
    return new Response(JSON.stringify({ enabled: true, top: [], basis, totals }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=0, s-maxage=60, stale-while-revalidate=300'
      }
    });
  }

  const statCommands: Array<[string, ...Array<string | number>]> = [];
  topList.forEach((entry) => {
    statCommands.push(['GET', `tool:${entry.id}:views`]);
    statCommands.push(['GET', `tool:${entry.id}:uses`]);
    statCommands.push(['SCARD', `tool:${entry.id}:unique:30d`]);
  });
  const totalsOffset = statCommands.length;
  statCommands.push(...totalsCommands);

  const statResults = await kvPipeline(statCommands);
  const top = topList.map((entry, index) => {
    const offset = index * 3;
    const views = normalizeNumber(statResults?.[offset]?.result);
    const uses = normalizeNumber(statResults?.[offset + 1]?.result);
    const uniques = normalizeNumber(statResults?.[offset + 2]?.result);
    return {
      id: entry.id,
      views,
      uses,
      uniques
    };
  });
  const totals = parseTotals(statResults, totalsOffset);

  return new Response(JSON.stringify({ enabled: true, top, basis, totals }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=0, s-maxage=60, stale-while-revalidate=300'
    }
  });
};
