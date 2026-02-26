"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";

type RunStatus = "active" | "blocked" | "completed" | "cancelled";
type TaskStatus = "todo" | "in_progress" | "blocked" | "done";
type TaskType = "research" | "write" | "review" | "qa" | "synthesis";

interface AgentOption {
  id: string;
  name: string;
  role?: string;
}

interface AgentRun {
  id: string;
  objective: string;
  status: RunStatus;
  created_at: string;
  max_parallel_agents: number;
}

interface AgentTask {
  id: string;
  title: string;
  task_type: TaskType;
  status: TaskStatus;
  assigned_agent_key_id: string;
  depends_on: string[];
  output_ref?: Record<string, unknown> | null;
}

interface RunBoardResponse {
  run: AgentRun;
  columns: Record<TaskStatus, AgentTask[]>;
  readiness: {
    unresolved_needs_input: number;
    open_branch_proposals: number;
    tasks_remaining: number;
  };
}

interface AgentRunBoardProps {
  workspaceId: string;
  documentId: string;
  agentOptions: AgentOption[];
}

const taskTypes: TaskType[] = ["research", "write", "review", "qa", "synthesis"];
const taskStatuses: TaskStatus[] = ["todo", "in_progress", "blocked", "done"];

async function apiJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const payload = await res.json();
  if (!res.ok) {
    throw new Error(payload?.error ?? "Request failed");
  }
  return payload as T;
}

export function AgentRunBoard({
  workspaceId,
  documentId,
  agentOptions,
}: AgentRunBoardProps) {
  const [runs, setRuns] = useState<AgentRun[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [board, setBoard] = useState<RunBoardResponse | null>(null);
  const [loadingRuns, setLoadingRuns] = useState(false);
  const [loadingBoard, setLoadingBoard] = useState(false);

  const [objective, setObjective] = useState("");
  const [coordinatorAgentId, setCoordinatorAgentId] = useState("");
  const [maxParallelAgents, setMaxParallelAgents] = useState(3);

  const [taskTitle, setTaskTitle] = useState("");
  const [taskType, setTaskType] = useState<TaskType>("research");
  const [taskAssignee, setTaskAssignee] = useState("");
  const [taskStatus, setTaskStatus] = useState<TaskStatus>("todo");
  const [scopeFrom, setScopeFrom] = useState("");
  const [scopeTo, setScopeTo] = useState("");
  const [dependencyIds, setDependencyIds] = useState<string[]>([]);

  useEffect(() => {
    if (!coordinatorAgentId && agentOptions.length > 0) {
      setCoordinatorAgentId(agentOptions[0].id);
    }
    if (!taskAssignee && agentOptions.length > 0) {
      setTaskAssignee(agentOptions[0].id);
    }
  }, [agentOptions, coordinatorAgentId, taskAssignee]);

  const loadRuns = useCallback(async () => {
    setLoadingRuns(true);
    try {
      const payload = await apiJson<{ data: AgentRun[] }>(
        `/api/agent-runs?workspaceId=${workspaceId}&documentId=${documentId}`
      );
      setRuns(payload.data ?? []);
      if (!selectedRunId && (payload.data?.length ?? 0) > 0) {
        setSelectedRunId(payload.data[0].id);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load runs");
    } finally {
      setLoadingRuns(false);
    }
  }, [workspaceId, documentId, selectedRunId]);

  const loadBoard = useCallback(async (runId: string) => {
    setLoadingBoard(true);
    try {
      const payload = await apiJson<{ data: RunBoardResponse }>(
        `/api/agent-runs/${runId}/board`
      );
      setBoard(payload.data);
    } catch (error) {
      setBoard(null);
      toast.error(error instanceof Error ? error.message : "Failed to load board");
    } finally {
      setLoadingBoard(false);
    }
  }, []);

  useEffect(() => {
    void loadRuns();
  }, [loadRuns]);

  useEffect(() => {
    if (!selectedRunId) {
      setBoard(null);
      return;
    }
    void loadBoard(selectedRunId);
  }, [selectedRunId, loadBoard]);

  const tasksFlat = useMemo(() => {
    if (!board) return [];
    return taskStatuses.flatMap((status) => board.columns[status] ?? []);
  }, [board]);

  const agentNameById = useMemo(
    () =>
      agentOptions.reduce<Record<string, string>>((acc, agent) => {
        acc[agent.id] = agent.name;
        return acc;
      }, {}),
    [agentOptions]
  );

  useEffect(() => {
    setDependencyIds((prev) => prev.filter((id) => tasksFlat.some((t) => t.id === id)));
  }, [tasksFlat]);

  const createRun = async () => {
    if (!objective.trim()) {
      toast.error("Objective is required");
      return;
    }
    if (!coordinatorAgentId) {
      toast.error("Coordinator agent is required");
      return;
    }

    try {
      const payload = await apiJson<{ data: AgentRun }>("/api/agent-runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspace_id: workspaceId,
          document_id: documentId,
          coordinator_agent_key_id: coordinatorAgentId,
          objective: objective.trim(),
          max_parallel_agents: maxParallelAgents,
        }),
      });

      toast.success("Run created");
      setObjective("");
      setRuns((prev) => [payload.data, ...prev]);
      setSelectedRunId(payload.data.id);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create run");
    }
  };

  const updateRunStatus = async (status: RunStatus) => {
    if (!selectedRunId) return;
    try {
      await apiJson<{ data: AgentRun }>(`/api/agent-runs/${selectedRunId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      toast.success(`Run marked ${status}`);
      await loadRuns();
      await loadBoard(selectedRunId);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update run");
    }
  };

  const createTask = async () => {
    if (!selectedRunId) {
      toast.error("Select a run first");
      return;
    }
    if (!taskTitle.trim()) {
      toast.error("Task title is required");
      return;
    }
    if (!taskAssignee) {
      toast.error("Task assignee is required");
      return;
    }

    const hasScopeNumbers = scopeFrom.trim() !== "" || scopeTo.trim() !== "";
    const documentScope = hasScopeNumbers
      ? {
          from: Number(scopeFrom || "0"),
          to: Number(scopeTo || "0"),
        }
      : undefined;

    if (
      documentScope &&
      (!Number.isFinite(documentScope.from) || !Number.isFinite(documentScope.to))
    ) {
      toast.error("Scope values must be numbers");
      return;
    }

    try {
      await apiJson(`/api/agent-runs/${selectedRunId}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: taskTitle.trim(),
          task_type: taskType,
          assigned_agent_key_id: taskAssignee,
          status: taskStatus,
          depends_on: dependencyIds,
          document_scope: documentScope,
        }),
      });
      toast.success("Task created");
      setTaskTitle("");
      setScopeFrom("");
      setScopeTo("");
      setDependencyIds([]);
      await loadBoard(selectedRunId);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create task");
    }
  };

  const moveTask = async (task: AgentTask, nextStatus: TaskStatus) => {
    if (!selectedRunId) return;

    let outputRef = task.output_ref ?? null;
    if (nextStatus === "blocked") {
      const reason = window.prompt("Block reason:");
      if (!reason || reason.trim().length === 0) return;
      outputRef = { ...(outputRef ?? {}), block_reason: reason.trim() };
    }
    if (nextStatus === "done" && task.task_type === "write") {
      const hasBranch = typeof outputRef?.branch_id === "string";
      const hasNoChangeReason = typeof outputRef?.no_change_reason === "string";
      if (!hasBranch && !hasNoChangeReason) {
        const reason = window.prompt(
          "Write task done requires branch_id or no_change_reason. Enter no_change_reason:"
        );
        if (!reason || reason.trim().length === 0) return;
        outputRef = { ...(outputRef ?? {}), no_change_reason: reason.trim() };
      }
    }

    try {
      await apiJson(`/api/agent-runs/${selectedRunId}/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus, output_ref: outputRef }),
      });
      await loadBoard(selectedRunId);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update task");
    }
  };

  const selectedRun = useMemo(
    () => runs.find((run) => run.id === selectedRunId) ?? null,
    [runs, selectedRunId]
  );

  return (
    <aside className="w-[28rem] border-l bg-background flex flex-col">
      <div className="px-4 py-3 border-b">
        <div className="font-semibold text-sm">Agent Run Board</div>
        <div className="text-xs text-muted-foreground mt-1">
          Multi-agent orchestration for this document.
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-4 p-4">
          <section className="space-y-2 border rounded-md p-3">
            <div className="text-xs font-medium">Create Run</div>
            <textarea
              value={objective}
              onChange={(event) => setObjective(event.target.value)}
              placeholder="Run objective..."
              className="w-full min-h-20 rounded-md border bg-transparent px-3 py-2 text-sm"
            />
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Coordinator</Label>
                <select
                  value={coordinatorAgentId}
                  onChange={(event) => setCoordinatorAgentId(event.target.value)}
                  className="h-9 w-full rounded-md border bg-transparent px-2 text-sm"
                >
                  {agentOptions.map((agent) => (
                    <option key={agent.id} value={agent.id}>
                      {agent.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Max Parallel</Label>
                <Input
                  type="number"
                  min={1}
                  max={10}
                  value={maxParallelAgents}
                  onChange={(event) =>
                    setMaxParallelAgents(Number(event.target.value) || 1)
                  }
                />
              </div>
            </div>
            <Button size="sm" onClick={createRun} disabled={!agentOptions.length}>
              Create Run
            </Button>
          </section>

          <section className="space-y-2 border rounded-md p-3">
            <div className="flex items-center justify-between">
              <div className="text-xs font-medium">Runs</div>
              <Button size="xs" variant="ghost" onClick={() => void loadRuns()}>
                Refresh
              </Button>
            </div>
            {loadingRuns ? (
              <div className="text-xs text-muted-foreground">Loading runs...</div>
            ) : runs.length === 0 ? (
              <div className="text-xs text-muted-foreground">No runs yet.</div>
            ) : (
              <div className="space-y-2">
                {runs.map((run) => (
                  <button
                    key={run.id}
                    type="button"
                    onClick={() => setSelectedRunId(run.id)}
                    className={`w-full text-left rounded border px-2 py-2 text-xs ${
                      selectedRunId === run.id ? "border-primary" : "border-border"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{run.status}</Badge>
                      <span className="text-muted-foreground">
                        p{run.max_parallel_agents}
                      </span>
                    </div>
                    <div className="mt-1 line-clamp-2">{run.objective}</div>
                  </button>
                ))}
              </div>
            )}
          </section>

          {selectedRun && (
            <section className="space-y-2 border rounded-md p-3">
              <div className="flex items-center justify-between">
                <div className="text-xs font-medium">Run Controls</div>
                <Badge variant="outline">{selectedRun.status}</Badge>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="xs" variant="outline" onClick={() => void updateRunStatus("active")}>
                  Active
                </Button>
                <Button size="xs" variant="outline" onClick={() => void updateRunStatus("blocked")}>
                  Blocked
                </Button>
                <Button size="xs" variant="outline" onClick={() => void updateRunStatus("completed")}>
                  Complete
                </Button>
                <Button size="xs" variant="outline" onClick={() => void updateRunStatus("cancelled")}>
                  Cancel
                </Button>
              </div>
            </section>
          )}

          {selectedRunId && (
            <section className="space-y-2 border rounded-md p-3">
            <div className="text-xs font-medium">Create Task</div>
              <Input
                value={taskTitle}
                onChange={(event) => setTaskTitle(event.target.value)}
                placeholder="Task title"
              />
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={taskType}
                  onChange={(event) => setTaskType(event.target.value as TaskType)}
                  className="h-9 rounded-md border bg-transparent px-2 text-sm"
                >
                  {taskTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
                <select
                  value={taskAssignee}
                  onChange={(event) => setTaskAssignee(event.target.value)}
                  className="h-9 rounded-md border bg-transparent px-2 text-sm"
                >
                  {agentOptions.map((agent) => (
                    <option key={agent.id} value={agent.id}>
                      {agent.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  value={scopeFrom}
                  onChange={(event) => setScopeFrom(event.target.value)}
                  placeholder="Scope from"
                />
                <Input
                  value={scopeTo}
                  onChange={(event) => setScopeTo(event.target.value)}
                  placeholder="Scope to"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Dependencies</Label>
                {tasksFlat.length === 0 ? (
                  <div className="rounded border px-2 py-2 text-xs text-muted-foreground">
                    No tasks available yet.
                  </div>
                ) : (
                  <div className="max-h-28 space-y-1 overflow-auto rounded border p-2">
                    {tasksFlat.map((task) => (
                      <label
                        key={task.id}
                        className="flex items-center gap-2 text-xs text-muted-foreground"
                      >
                        <input
                          type="checkbox"
                          checked={dependencyIds.includes(task.id)}
                          onChange={(event) =>
                            setDependencyIds((prev) =>
                              event.target.checked
                                ? [...prev, task.id]
                                : prev.filter((id) => id !== task.id)
                            )
                          }
                        />
                        <span className="truncate">
                          {task.title} ({task.id.slice(0, 8)})
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
              <select
                value={taskStatus}
                onChange={(event) => setTaskStatus(event.target.value as TaskStatus)}
                className="h-9 w-full rounded-md border bg-transparent px-2 text-sm"
              >
                {taskStatuses.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
              <Button size="sm" onClick={createTask}>
                Add Task
              </Button>
            </section>
          )}

          {selectedRunId && (
            <section className="space-y-2 border rounded-md p-3">
              <div className="flex items-center justify-between">
                <div className="text-xs font-medium">Board</div>
                <Button
                  size="xs"
                  variant="ghost"
                  onClick={() => selectedRunId && void loadBoard(selectedRunId)}
                >
                  Refresh
                </Button>
              </div>
              {loadingBoard ? (
                <div className="text-xs text-muted-foreground">Loading board...</div>
              ) : !board ? (
                <div className="text-xs text-muted-foreground">No board data.</div>
              ) : (
                <>
                  <div className="grid grid-cols-3 gap-2 text-[11px] text-muted-foreground">
                    <div>
                      Needs input:{" "}
                      <span className="font-medium text-foreground">
                        {board.readiness.unresolved_needs_input}
                      </span>
                    </div>
                    <div>
                      Branches:{" "}
                      <span className="font-medium text-foreground">
                        {board.readiness.open_branch_proposals}
                      </span>
                    </div>
                    <div>
                      Remaining:{" "}
                      <span className="font-medium text-foreground">
                        {board.readiness.tasks_remaining}
                      </span>
                    </div>
                  </div>
                  {taskStatuses.map((status) => (
                    <div key={status} className="space-y-1">
                      <div className="text-xs font-medium uppercase tracking-wide">
                        {status.replace("_", " ")} ({board.columns[status]?.length ?? 0})
                      </div>
                      {(board.columns[status] ?? []).length === 0 ? (
                        <div className="text-xs text-muted-foreground">No tasks.</div>
                      ) : (
                        (board.columns[status] ?? []).map((task) => (
                          <div key={task.id} className="rounded border p-2 text-xs space-y-1">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">{task.task_type}</Badge>
                              <Badge variant="secondary">
                                {agentNameById[task.assigned_agent_key_id] ?? "Agent"}
                              </Badge>
                              <span className="text-muted-foreground">
                                {task.id.slice(0, 8)}
                              </span>
                            </div>
                            <div>{task.title}</div>
                            {task.depends_on.length > 0 && (
                              <div className="text-[11px] text-muted-foreground">
                                Depends on:{" "}
                                {task.depends_on.map((id) => id.slice(0, 8)).join(", ")}
                              </div>
                            )}
                            <div className="flex flex-wrap gap-1">
                              {taskStatuses
                                .filter((next) => next !== task.status)
                                .map((next) => (
                                  <Button
                                    key={next}
                                    size="xs"
                                    variant="ghost"
                                    onClick={() => void moveTask(task, next)}
                                  >
                                    {next}
                                  </Button>
                                ))}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  ))}
                </>
              )}
            </section>
          )}
        </div>
      </ScrollArea>
    </aside>
  );
}
