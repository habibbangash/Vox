-- SQL aggregate functions for the analytics page.
-- Replaces O(N) full-table fetches + JS aggregation with server-side GROUP BY.
-- All functions are SECURITY DEFINER so they bypass RLS and run as the owner.

CREATE OR REPLACE FUNCTION analytics_docs_by_source(p_workspace_id uuid)
RETURNS TABLE(source_type text, cnt bigint)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT source_type, COUNT(*)::bigint AS cnt
  FROM source_documents
  WHERE workspace_id = p_workspace_id
  GROUP BY source_type
  ORDER BY cnt DESC;
$$;

CREATE OR REPLACE FUNCTION analytics_signals_summary(p_workspace_id uuid)
RETURNS TABLE(signal_type text, active_cnt bigint, dismissed_cnt bigint)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT
    signal_type,
    COUNT(*) FILTER (WHERE dismissed_at IS NULL)::bigint  AS active_cnt,
    COUNT(*) FILTER (WHERE dismissed_at IS NOT NULL)::bigint AS dismissed_cnt
  FROM signals
  WHERE workspace_id = p_workspace_id
  GROUP BY signal_type
  ORDER BY active_cnt DESC;
$$;

CREATE OR REPLACE FUNCTION analytics_drafts_by_status(p_workspace_id uuid)
RETURNS TABLE(status text, cnt bigint)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT status, COUNT(*)::bigint AS cnt
  FROM content_drafts
  WHERE workspace_id = p_workspace_id
  GROUP BY status;
$$;

CREATE OR REPLACE FUNCTION analytics_drafts_by_format(p_workspace_id uuid)
RETURNS TABLE(format text, cnt bigint)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT format, COUNT(*)::bigint AS cnt
  FROM content_drafts
  WHERE workspace_id = p_workspace_id
  GROUP BY format
  ORDER BY cnt DESC;
$$;
