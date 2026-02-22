-- Atomic branch merge: copies branch content to source document and updates
-- branch status in a single transaction to prevent race conditions.
CREATE OR REPLACE FUNCTION merge_document_branch(
  p_branch_id uuid,
  p_source_document_id uuid,
  p_merged_by uuid
)
RETURNS uuid
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

  IF v_branch.status != 'open' THEN
    RAISE EXCEPTION 'Branch is not open';
  END IF;

  -- Get branch document content
  SELECT content INTO v_branch_content
  FROM public.documents
  WHERE id = v_branch.branch_document_id;

  -- Copy branch content to source document
  UPDATE public.documents
  SET content = v_branch_content,
      updated_at = now(),
      last_edited_by = p_merged_by
  WHERE id = p_source_document_id;

  -- Update branch status
  UPDATE public.document_branches
  SET status = 'merged',
      merged_by = p_merged_by,
      merged_at = now(),
      updated_at = now()
  WHERE id = p_branch_id;

  RETURN p_branch_id;
END;
$$;
