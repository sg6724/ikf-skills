import { NextRequest } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

function guessMediaType(filename?: string): string {
    if (!filename) return 'application/octet-stream';
    const lower = filename.toLowerCase();
    if (lower.endsWith('.md')) return 'text/markdown';
    if (lower.endsWith('.txt')) return 'text/plain';
    if (lower.endsWith('.pdf')) return 'application/pdf';
    if (lower.endsWith('.docx')) return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    if (lower.endsWith('.xlsx')) return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    if (lower.endsWith('.png')) return 'image/png';
    if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
    if (lower.endsWith('.webp')) return 'image/webp';
    return 'application/octet-stream';
}

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const response = await fetch(
            `${BACKEND_URL}/api/conversations/${id}`,
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

        // Transform messages to AI SDK UIMessage format
        const uiMessages = (data.messages || []).map((msg: any) => ({
            id: String(msg.id) || crypto.randomUUID(),
            role: msg.role,
            parts: [
                { type: 'text', text: msg.content || '' },
                // Include artifacts (if any) as file parts so they can render in AI Elements.
                ...(Array.isArray(msg.artifacts)
                    ? msg.artifacts.map((a: any) => ({
                        type: 'file',
                        url: a.url,
                        mediaType: a.mediaType || guessMediaType(a.filename),
                        filename: a.filename,
                    }))
                    : []),
            ],
            createdAt: msg.timestamp ? new Date(msg.timestamp) : new Date(),
        }));

        return new Response(JSON.stringify({
            ...data,
            messages: uiMessages,
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (error) {
        console.error('Conversation GET API error:', error);
        return new Response(
            JSON.stringify({ error: 'Failed to connect to backend' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
}

export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const response = await fetch(
            `${BACKEND_URL}/api/conversations/${id}`,
            {
                method: 'DELETE',
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

        return new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (error) {
        console.error('Conversation DELETE API error:', error);
        return new Response(
            JSON.stringify({ error: 'Failed to connect to backend' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
}
