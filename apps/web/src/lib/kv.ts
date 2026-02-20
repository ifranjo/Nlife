const KV_URL = import.meta.env.KV_REST_API_URL;
const KV_TOKEN = import.meta.env.KV_REST_API_TOKEN;

type KvResult<T = unknown> = {
  result: T;
  error?: string;
};

export const kvEnabled = Boolean(KV_URL && KV_TOKEN);

const toArgs = (args: Array<string | number>) => args.map((value) => String(value));

const kvFetch = async (payload: unknown) => {
  if (!KV_URL || !KV_TOKEN) {
    return null;
  }

  const response = await fetch(KV_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${KV_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    return null;
  }

  return (await response.json()) as KvResult;
};

export const kvCommand = async <T = unknown>(command: string, ...args: Array<string | number>) => {
  const response = await kvFetch([command, ...toArgs(args)]);
  return response as KvResult<T> | null;
};

export const kvPipeline = async (commands: Array<[string, ...Array<string | number>]>) => {
  const payload = commands.map(([command, ...args]) => [command, ...toArgs(args)]);
  const response = await kvFetch(payload);
  return response as KvResult[] | null;
};
