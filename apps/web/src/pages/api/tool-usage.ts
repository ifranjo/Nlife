import type { APIRoute } from 'astro';
import { createHash } from 'node:crypto';
import { getToolById } from '../../lib/tools';
import { kvEnabled, kvPipeline } from '../../lib/kv';

export const prerender = false;

const EVENT_TYPES = new Set(['view', 'use', 'download', 'hub_click']);
const UNIQUE_TTL_SECONDS = 60 * 60 * 24 * 30;

const parseToolIdFromPath = (path?: string | null) => {
  if (!path) return null;
  const match = path.match(/^\/tools\/([^/]+)/);
  return match ? match[1] : null;
};

const getClientFingerprint = (headers: Headers, toolId: string) => {
  const forwarded = headers.get('x-forwarded-for') || '';
  const ip = forwarded.split(',')[0]?.trim() || headers.get('x-real-ip') || '0.0.0.0';
  const ua = headers.get('user-agent') || 'unknown';
  const day = new Date().toISOString().slice(0, 10);
  return createHash('sha256')
    .update(`${ip}|${ua}|${day}|${toolId}`)
    .digest('hex')
    .slice(0, 32);
};

export const POST: APIRoute = async ({ request }) => {
  if (!kvEnabled) {
    return new Response(null, { status: 202 });
  }

  let payload: { toolId?: string; event?: string; path?: string } = {};
  try {
    payload = await request.json();
  } catch {
    return new Response(null, { status: 400 });
  }

  const toolId = payload.toolId || parseToolIdFromPath(payload.path);
  if (!toolId || !getToolById(toolId)) {
    return new Response(null, { status: 204 });
  }

  const event = EVENT_TYPES.has(payload.event || '') ? payload.event : 'view';
  const commands: Array<[string, ...Array<string | number>]> = [];

  if (event === 'view') {
    commands.push(['INCR', `tool:${toolId}:views`]);
    commands.push(['ZINCRBY', 'tools:rank:views', 1, toolId]);

    const fingerprint = getClientFingerprint(request.headers, toolId);
    commands.push(['SADD', `tool:${toolId}:unique:30d`, fingerprint]);
    commands.push(['EXPIRE', `tool:${toolId}:unique:30d`, UNIQUE_TTL_SECONDS]);
  }

  if (event === 'use' || event === 'download' || event === 'hub_click') {
    commands.push(['INCR', `tool:${toolId}:uses`]);
    commands.push(['ZINCRBY', 'tools:rank:uses', 1, toolId]);
  }

  if (commands.length) {
    await kvPipeline(commands);
  }

  return new Response(null, { status: 204 });
};
