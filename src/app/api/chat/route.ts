import { streamText } from 'ai';
import { openrouter } from '@openrouter/ai-sdk-provider';

export async function POST(req: Request) {
  try {
    // Check if request has a body
    const body = await req.text();
    
    if (!body) {
      return new Response(
        JSON.stringify({ error: 'Request body is empty' }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Parse the JSON
    const { messages } = JSON.parse(body);

    // Validate messages
    if (!messages || !Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ error: 'Messages must be an array' }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    const result = streamText({
      model: openrouter('openai/gpt-oss-20b:free'),
      messages: messages,
    });

    return result.toTextStreamResponse();
  } catch (error) {
    console.error('Error in chat route:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to process request',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}