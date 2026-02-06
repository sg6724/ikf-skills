import { NextRequest } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const limit = searchParams.get('limit') || '50';
        const offset = searchParams.get('offset') || '0';

        const response = await fetch(
            `${BACKEND_URL}/api/conversations?limit=${limit}&offset=${offset}`,
            {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            }
        );

        if (!response.ok) {
            const errorText = await response.text();
            return new Response(
                JSON.stringify({ error: `Backend error: ${response.status} - ${errorText}` }),
                { status: response.status, headers: { 'Content-Type': 'application/json' } }
            );
        }

        const data = await response.json();
        return new Response(JSON.stringify(data), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (error) {
        console.error('Conversations API error:', error);
        return new Response(
            JSON.stringify({ error: 'Failed to connect to backend' }),
            { status: 502, headers: { 'Content-Type': 'application/json' } }
        );
    }
}
