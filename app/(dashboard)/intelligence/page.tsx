import { getRecentDocuments, getTopEntities } from '@/app/actions/intelligence'
import { SearchInterface } from './_components/search-interface'

const ENTITY_TYPE_STYLE: Record<string, { label: string; chip: string }> = {
  person:         { label: 'People',         chip: 'bg-violet-50 text-violet-700 dark:bg-violet-950 dark:text-violet-300'  },
  company:        { label: 'Companies',       chip: 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300'          },
  topic:          { label: 'Topics',          chip: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'     },
  theme:          { label: 'Themes',          chip: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'     },
  objection:      { label: 'Objections',      chip: 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300'     },
  buying_signal:  { label: 'Buying signals',  chip: 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300'     },
  product:        { label: 'Products',        chip: 'bg-cyan-50 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300'         },
  competitor:     { label: 'Competitors',     chip: 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300'             },
  other:          { label: 'Other',           chip: 'bg-muted text-muted-foreground'                                        },
}

export default async function IntelligencePage() {
  const [initial, entities] = await Promise.all([getRecentDocuments(), getTopEntities()])

  const grouped = entities.reduce<Record<string, typeof entities>>((acc, e) => {
    const key = e.type in ENTITY_TYPE_STYLE ? e.type : 'other'
    if (!acc[key]) acc[key] = []
    acc[key].push(e)
    return acc
  }, {})

  const orderedTypes = ['person', 'company', 'topic', 'theme', 'objection', 'buying_signal', 'product', 'competitor', 'other']

  return (
    <div className="p-8 max-w-3xl space-y-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight mb-1">Intelligence</h1>
        <p className="text-muted-foreground text-sm">
          Search across every meeting, transcript, and article in your workspace.
        </p>
      </div>

      <SearchInterface initial={initial} />

      {entities.length > 0 && (
        <section className="space-y-5">
          <div>
            <h2 className="text-base font-medium">Entity graph</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              People, companies, topics, and signals extracted from your content — sorted by mention frequency.
            </p>
          </div>

          <div className="space-y-4">
            {orderedTypes.filter((t) => grouped[t]?.length > 0).map((type) => {
              const style = ENTITY_TYPE_STYLE[type] ?? ENTITY_TYPE_STYLE.other
              return (
                <div key={type}>
                  <p className="text-xs font-medium text-muted-foreground mb-2">{style.label}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {grouped[type].map((entity) => (
                      <span
                        key={entity.id}
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${style.chip}`}
                        title={`${entity.mention_count} mention${entity.mention_count !== 1 ? 's' : ''}`}
                      >
                        {entity.canonical_name}
                        <span className="opacity-60 text-[10px]">{entity.mention_count}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}
    </div>
  )
}
