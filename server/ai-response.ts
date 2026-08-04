export type CompletionShape = {
  choices?: Array<{ finish_reason?: string | null; message?: { content?: string | null } }>;
  usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
};

export function readCompletion(completion: CompletionShape) {
  const choice = completion.choices?.[0];
  const content = choice?.message?.content;
  if (typeof content !== 'string' || !content.trim()) {
    throw Object.assign(new Error('AI服务未返回有效内容，请稍后重试'), { status: 502, code: 'AI_EMPTY_RESPONSE' });
  }
  return { content, finishReason: choice?.finish_reason, usage: completion.usage };
}
