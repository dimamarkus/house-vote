import { NextResponse } from 'next/server';

export const extensionCorsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
  'Access-Control-Max-Age': '86400',
};

export function extensionOptionsResponse() {
  return new NextResponse(null, {
    status: 204,
    headers: extensionCorsHeaders,
  });
}

export function extensionJson<TBody>(body: TBody, init?: ResponseInit) {
  return NextResponse.json(body, {
    ...init,
    headers: {
      ...extensionCorsHeaders,
      ...init?.headers,
    },
  });
}
