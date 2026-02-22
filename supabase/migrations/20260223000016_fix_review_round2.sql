-- Migration 16: Fix review issues (round 2)
-- C3: Add CHECK constraint on scratchpad_events.event_type
-- H5: Add explicit INSERT/UPDATE/DELETE deny policies to scratchpad_events
-- H6: Update merge function to soft-delete branch document
-- M6 fix: merged_by assignment (remove unnecessary ::text cast)

-- C3: Add CHECK constraint for event_type
ALTER TABLE public.scratchpad_events
  ADD CONSTRAINT check_scratchpad_event_type
  CHECK (event_type IN ('thinking', 'tool_use', 'progress', 'error'));

-- H5: Add explicit deny policies for non-SELECT operations on scratchpad_events.
-- Agents insert via admin client (service role, bypasses RLS). These policies make
-- the intent explicit and prevent accidental inserts via user client.
CREATE POLICY "No public insert to scratchpad_events"
  ON public.scratchpad_events FOR INSERT
  WITH CHECK (false);

CREATE POLICY "No public update to scratchpad_events"
  ON public.scratchpad_events FOR UPDATE
  USING (false);

CREATE POLICY "No public delete from scratchpad_events"
  ON public.scratchpad_events FOR DELETE
  USING (false);

-- H6: Replace merge function to also soft-delete the branch document after merge.
-- Also fixes the merged_by assignment (no unnecessary ::text cast since column is uuid).
CREATE OR REPLACE FUNCTION merge_document_branch(
  p_branch_id uuid,
  p_source_document_id uuid,
  p_merged_by uuid
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_branch record;
  v_branch_content jsonb;
BEGIN
  -- Lock the branch row to prevent concurrent merges
  SELECT * INTO v_branch
    FROM public.document_branches
    WHERE id = p_branch_id
      AND source_document_id = p_source_document_id
    FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Branch not found';
  END IF;

  IF v_branch.status <> 'open' THEN
    RAISE EXCEPTION 'Branch is not open';
  END IF;

  -- Get the branch document content
  SELECT content INTO v_branch_content
    FROM public.documents
    WHERE id = v_branch.branch_document_id;

  -- Copy branch content to source document
  UPDATE public.documents
    SET content = v_branch_content,
        updated_at = now()
    WHERE id = p_source_document_id;

  -- Soft-delete the branch document so it doesn't clutter the workspace
  UPDATE public.documents
    SET deleted_at = now(),
        updated_at = now()
    WHERE id = v_branch.branch_document_id;

  -- Mark branch as merged
  UPDATE public.document_branches
    SET status = 'merged',
        merged_by = p_merged_by,
        merged_at = now(),
        updated_at = now()
    WHERE id = p_branch_id;

  RETURN p_branch_id;
END;
$$;
