-- Preserve dismissed and pinned signals across hourly recompute.
-- Previously: DELETE wiped the entire workspace's signals including user actions.
CREATE OR REPLACE FUNCTION public.compute_signals()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ws RECORD;
BEGIN
  FOR ws IN SELECT id FROM public.workspaces LOOP
    DELETE FROM public.signals
    WHERE workspace_id = ws.id
      AND dismissed_at IS NULL
      AND pinned_at    IS NULL;

    INSERT INTO public.signals
      (workspace_id, signal_type, entity_id, title, description, document_count, source_count, time_window)
    SELECT ws.id,'recurring_topic',e.id,e.canonical_name,
      'Mentioned across '||count(distinct em.document_id)::text||' documents in the last 30 days.',
      count(distinct em.document_id)::int,count(distinct sd.source_type)::int,'30_days'
    FROM public.entity_mentions em JOIN public.entities e ON e.id=em.entity_id
    JOIN public.source_documents sd ON sd.id=em.document_id
    WHERE em.workspace_id=ws.id AND em.mentioned_at>now()-interval'30 days'
      AND e.type IN('topic','theme','product')
    GROUP BY e.id,e.canonical_name HAVING count(distinct em.document_id)>=3
    ORDER BY count(distinct em.document_id) DESC LIMIT 20 ON CONFLICT DO NOTHING;

    INSERT INTO public.signals
      (workspace_id, signal_type, entity_id, title, description, document_count, source_count, time_window)
    SELECT ws.id,'objection_trend',e.id,e.canonical_name,
      'Recurring objection spotted in '||count(distinct em.document_id)::text||' sources.',
      count(distinct em.document_id)::int,count(distinct sd.source_type)::int,'30_days'
    FROM public.entity_mentions em JOIN public.entities e ON e.id=em.entity_id
    JOIN public.source_documents sd ON sd.id=em.document_id
    WHERE em.workspace_id=ws.id AND em.mentioned_at>now()-interval'30 days' AND e.type='objection'
    GROUP BY e.id,e.canonical_name HAVING count(distinct em.document_id)>=2
    ORDER BY count(distinct em.document_id) DESC LIMIT 10 ON CONFLICT DO NOTHING;

    INSERT INTO public.signals
      (workspace_id, signal_type, entity_id, title, description, document_count, source_count, time_window)
    SELECT ws.id,'buying_signal',e.id,e.canonical_name,
      'Buying intent detected across '||count(distinct em.document_id)::text||' documents.',
      count(distinct em.document_id)::int,count(distinct sd.source_type)::int,'30_days'
    FROM public.entity_mentions em JOIN public.entities e ON e.id=em.entity_id
    JOIN public.source_documents sd ON sd.id=em.document_id
    WHERE em.workspace_id=ws.id AND em.mentioned_at>now()-interval'30 days' AND e.type='buying_signal'
    GROUP BY e.id,e.canonical_name HAVING count(distinct em.document_id)>=1
    ORDER BY count(distinct em.document_id) DESC LIMIT 10 ON CONFLICT DO NOTHING;

    INSERT INTO public.signals
      (workspace_id, signal_type, entity_id, title, description, document_count, source_count, time_window)
    SELECT ws.id,'competitor_mention',e.id,e.canonical_name,
      'Competitor appearing in '||count(distinct em.document_id)::text||' sources — worth a battle card.',
      count(distinct em.document_id)::int,count(distinct sd.source_type)::int,'30_days'
    FROM public.entity_mentions em JOIN public.entities e ON e.id=em.entity_id
    JOIN public.source_documents sd ON sd.id=em.document_id
    WHERE em.workspace_id=ws.id AND em.mentioned_at>now()-interval'30 days' AND e.type='competitor'
    GROUP BY e.id,e.canonical_name HAVING count(distinct em.document_id)>=2
    ORDER BY count(distinct em.document_id) DESC LIMIT 10 ON CONFLICT DO NOTHING;

  END LOOP;
END;
$$;
GRANT EXECUTE ON FUNCTION public.compute_signals() TO service_role;
