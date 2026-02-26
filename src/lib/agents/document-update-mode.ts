export function shouldCreateBranchProposal(
  actorType: 'user' | 'agent',
  applyDirectly: boolean
) {
  return actorType === 'agent' && !applyDirectly
}

