import { NextRequest } from 'next/server';
import type { IncomingMessage } from 'node:http';
import { request as httpRequest } from 'node:http';
import { request as httpsRequest } from 'node:https';
import { Readable } from 'node:stream';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

// Ensure the route is always dynamic and uses the Node runtime so we can proxy streams reliably.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const maxDuration = 300; // Allow up to 5 minutes for long agent executions

interface ChatPart {
    type: string;
    text?: string;
}

interface ChatRequestBody {
    messages?: Array<{
        content?: string | ChatPart[];
        parts?: ChatPart[];
    }>;
    conversationId?: string;
    conversation_id?: string;
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json() as ChatRequestBody;

        // Extract message from the AI SDK request shape.
        let message: string | undefined;

        // Check for AI SDK format with messages array
        if (body.messages && Array.isArray(body.messages)) {
            const lastMessage = body.messages[body.messages.length - 1];
            // AI SDK messages have content as string or array of parts
            if (typeof lastMessage?.content === 'string') {
                message = lastMessage.content;
            } else if (Array.isArray(lastMessage?.content)) {
                const textPart = lastMessage.content.find((p) => p.type === 'text');
                message = textPart?.text;
            } else if (lastMessage?.parts) {
                const textPart = lastMessage.parts.find((p) => p.type === 'text');
                message = textPart?.text;
            }
        }

        const conversationId = body.conversationId || body.conversation_id;

        if (!message) {
            return new Response(
                JSON.stringify({ error: 'No message found in request body' }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            );
        }

        // Proxy the backend SSE stream.
        //
        // Note: Next.js route handlers + undici fetch can buffer upstream SSE until enough bytes arrive.
        // Using node http(s) request streams avoids that and forwards chunks immediately.
        const backend = new URL('/api/chat', BACKEND_URL);
        const payload = JSON.stringify({
            message,
            conversation_id: conversationId || null,
        });

        const backendRes: IncomingMessage = await new Promise((resolve, reject) => {
            const requester = backend.protocol === 'https:' ? httpsRequest : httpRequest;

            const r = requester(
                backend,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Accept: 'text/event-stream',
                        'Cache-Control': 'no-cache',
                        // Avoid upstream compression which can buffer SSE until the end.
                        'Accept-Encoding': 'identity',
                        Connection: 'keep-alive',
                        'Content-Length': Buffer.byteLength(payload).toString(),
                    },
                },
                (res) => resolve(res)
            );

            r.on('error', reject);
            req.signal.addEventListener('abort', () => r.destroy(new Error('aborted')));

            r.write(payload);
            r.end();
        });

        const status = backendRes.statusCode ?? 502;
        if (status >= 400) {
            const chunks: Buffer[] = [];
            for await (const chunk of backendRes) {
                chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
            }
            const errorText = Buffer.concat(chunks).toString('utf8');
            console.error('Backend error:', status, errorText);
            return new Response(
                JSON.stringify({ error: `Backend error: ${status} - ${errorText}` }),
                { status, headers: { 'Content-Type': 'application/json' } }
            );
        }

        const stream = Readable.toWeb(backendRes) as ReadableStream;
        return new Response(stream, {
            status: 200,
            headers: {
                'Content-Type': 'text/event-stream; charset=utf-8',
                // no-transform helps prevent proxies from buffering/chunk coalescing.
                'Cache-Control': 'no-cache, no-store, no-transform, must-revalidate',
                'Connection': 'keep-alive',
                'X-Accel-Buffering': 'no',
                // AI SDK v6 UI message stream header - enables proper parsing of tool parts
                'x-vercel-ai-ui-message-stream': 'v1',
                // Ensure chunked transfer and no compression for proper streaming
                'Transfer-Encoding': 'chunked',
                'Content-Encoding': 'none',
            },
        });
    } catch (error) {
        console.error('Chat API error:', error);
        return new Response(
            JSON.stringify({ error: 'Failed to connect to backend' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
}
