import { NextRequest } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ conversationId: string; filename: string }> }
) {
    try {
        const { conversationId, filename } = await params;
        const backendPath = `/api/artifacts/${encodeURIComponent(conversationId)}/${encodeURIComponent(filename)}`;
        const response = await fetch(new URL(backendPath, BACKEND_URL), {
            method: 'GET',
            cache: 'no-store',
        });

        if (!response.ok) {
            const errorText = await response.text();
            return new Response(
                JSON.stringify({ error: `Backend error: ${response.status} - ${errorText}` }),
                { status: response.status, headers: { 'Content-Type': 'application/json' } }
            );
        }

        const headers = new Headers();
        const contentType = response.headers.get('content-type');
        const contentDisposition = response.headers.get('content-disposition');
        const contentLength = response.headers.get('content-length');
        const cacheControl = response.headers.get('cache-control');
        const etag = response.headers.get('etag');
        const lastModified = response.headers.get('last-modified');

        if (contentType) headers.set('Content-Type', contentType);
        if (contentDisposition) headers.set('Content-Disposition', contentDisposition);
        if (contentLength) headers.set('Content-Length', contentLength);
        if (cacheControl) headers.set('Cache-Control', cacheControl);
        if (etag) headers.set('ETag', etag);
        if (lastModified) headers.set('Last-Modified', lastModified);

        return new Response(response.body, {
            status: 200,
            headers,
        });
    } catch (error) {
        console.error('Artifact proxy API error:', error);
        return new Response(
            JSON.stringify({ error: 'Failed to connect to backend' }),
            { status: 502, headers: { 'Content-Type': 'application/json' } }
        );
    }
}
