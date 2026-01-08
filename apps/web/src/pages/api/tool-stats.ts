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
    return new Response(JSON.stringify({ enabled: true, top: [], basis }), {
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

  return new Response(JSON.stringify({ enabled: true, top, basis }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=0, s-maxage=60, stale-while-revalidate=300'
    }
  });
};
