import { NextResponse } from 'next/server';
import {
  CURRENT_APP_VERSION,
  CURRENT_RELEASE_TITLE,
  CURRENT_RELEASE_DATE,
  CURRENT_RELEASE_HIGHLIGHTS,
} from '@/lib/version';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  return NextResponse.json(
    {
      version: CURRENT_APP_VERSION,
      title: CURRENT_RELEASE_TITLE,
      releaseDate: CURRENT_RELEASE_DATE,
      highlights: CURRENT_RELEASE_HIGHLIGHTS,
      timestamp: Date.now(),
    },
    {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
        Pragma: 'no-cache',
        Expires: '0',
      },
    }
  );
}
