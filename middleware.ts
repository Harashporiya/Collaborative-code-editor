import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
    const isProduction = process.env.NODE_ENV === 'production';
    const proto = request.headers.get('x-forwarded-proto') || request.nextUrl.protocol.slice(0, -1);
    if (isProduction && proto === 'http' && !request.headers.get('host')?.includes('localhost')) {
        console.warn('[Security] HTTP request detected in production:', request.nextUrl.toString());
    }
    return NextResponse.next();
}

export const config = {
    matcher: '/:path*',
};