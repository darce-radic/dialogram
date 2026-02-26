import { z } from 'zod'

export const lifecycleStateSchema = z.enum([
  'received',
  'analyzing',
  'drafting',
  'waiting_for_approval',
  'applied',
  'failed',
])

export const communicationContractSchema = z.object({
  intent: z.string().min(1).max(500),
  assumptions: z.array(z.string().min(1).max(500)).max(10),
  action_plan: z.array(z.string().min(1).max(500)).min(1).max(10),
  confidence: z.number().min(0).max(1),
  needs_input: z.boolean(),
  question: z.string().min(1).max(500).optional(),
})

export type LifecycleState = z.infer<typeof lifecycleStateSchema>
export type CommunicationContract = z.infer<typeof communicationContractSchema>

export function parseCommunicationContract(
  raw: unknown
): { ok: true; data: CommunicationContract } | { ok: false; error: string } {
  const result = communicationContractSchema.safeParse(raw)
  if (!result.success) {
    return {
      ok: false,
      error:
        'Invalid communication contract. Required: intent, assumptions[], action_plan[], confidence (0-1), needs_input.',
    }
  }

  if (result.data.needs_input && !result.data.question) {
    return {
      ok: false,
      error: 'communication.question is required when needs_input=true',
    }
  }

  return { ok: true, data: result.data }
}

export function parseLifecycleState(
  raw: unknown
): { ok: true; data: LifecycleState } | { ok: false; error: string } {
  const result = lifecycleStateSchema.safeParse(raw)
  if (!result.success) {
    return {
      ok: false,
      error:
        'Invalid lifecycle state. Expected one of: received, analyzing, drafting, waiting_for_approval, applied, failed.',
    }
  }
  return { ok: true, data: result.data }
}

export function formatCommunicationSummary(contract: CommunicationContract) {
  const assumptions = contract.assumptions.map((a) => `- ${a}`).join('\n')
  const actionPlan = contract.action_plan.map((s) => `- ${s}`).join('\n')
  const questionLine =
    contract.needs_input && contract.question
      ? `Question: ${contract.question}`
      : 'Question: none'

  return [
    'Agent Communication Contract',
    `Intent: ${contract.intent}`,
    'Assumptions:',
    assumptions || '- none',
    'Action Plan:',
    actionPlan,
    `Confidence: ${contract.confidence}`,
    `Needs Input: ${contract.needs_input}`,
    questionLine,
  ].join('\n')
}

