import { supabase } from '../supabase'

export type ChatRole = 'user' | 'assistant'

export type ChatMessage = {
  role: ChatRole
  content: string
}

export type RawToolResult = {
  name: string
  result: Record<string, unknown>
}

export type SendMessageResult = {
  text: string | null
  toolNotifications: string[]
  rawToolResults: RawToolResult[]
  isTimeout: boolean
  error: string | null
}

const TIMEOUT_MS = 60_000

/**
 * Sends a conversation to the Supabase Edge Function `/functions/v1/chat`.
 * The Edge Function returns `{ response: string, toolNotifications, rawToolResults }`.
 * Uses Promise.race for a 60-second timeout (supabase.functions.invoke has no AbortSignal).
 */
export async function sendMessage(
  messages: ChatMessage[],
  projectId: string,
): Promise<SendMessageResult> {
  type EdgeResponse = {
    /** Main text reply from the AI. */
    response: string
    toolNotifications: string[]
    rawToolResults: RawToolResult[]
    error?: string
  }

  console.log('Calling chat with projectId:', projectId)

  const invokePromise = supabase.functions.invoke<EdgeResponse>('chat', {
    body: { messages, projectId },
  })

  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('__TIMEOUT__')), TIMEOUT_MS),
  )

  try {
    const { data, error } = await Promise.race([invokePromise, timeoutPromise])
    console.log('Edge Function response:', { data, error })

    if (error) {
      const msg = String(error.message ?? error)
      const isUnavailable =
        msg.includes('Failed to send') ||
        msg.includes('not found') ||
        msg.includes('FunctionsFetchError') ||
        msg.includes('relay')
      return {
        text: null,
        toolNotifications: [],
        rawToolResults: [],
        isTimeout: false,
        error: isUnavailable
          ? 'AI Assistant unavailable. Check Edge Function deployment.'
          : msg,
      }
    }

    // Edge function returned an error payload
    if (data?.error) {
      return {
        text: null,
        toolNotifications: [],
        rawToolResults: [],
        isTimeout: false,
        error: data.error,
      }
    }

    const responseText = data?.response ?? ''
    if (responseText === '') {
      // Edge Function returned no text. Surface a diagnostic error so the caller
      // can display it rather than showing the generic "Could not process" message.
      const hint = data
        ? `Edge Function returned an empty response. toolNotifications=${JSON.stringify(data.toolNotifications)}`
        : 'Edge Function returned no data.'
      return {
        text: null,
        toolNotifications: data?.toolNotifications ?? [],
        rawToolResults: data?.rawToolResults ?? [],
        isTimeout: false,
        error: hint,
      }
    }
    return {
      text: responseText,
      toolNotifications: data?.toolNotifications ?? [],
      rawToolResults: data?.rawToolResults ?? [],
      isTimeout: false,
      error: null,
    }
  } catch (err) {
    const isTimeout = err instanceof Error && err.message === '__TIMEOUT__'
    return {
      text: null,
      toolNotifications: [],
      rawToolResults: [],
      isTimeout,
      error: isTimeout ? 'Request timed out after 60 seconds.' : String(err),
    }
  }
}
