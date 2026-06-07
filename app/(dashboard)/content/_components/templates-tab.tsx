'use client'
import { Share2, Mail, BookOpen, Shield, Newspaper, MailOpen, Target } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Template {
  id:          string
  format:      string
  label:       string
  description: string
  strategy:    string
  icon:        React.ReactNode
  available:   boolean
}

const TEMPLATES: Template[] = [
  {
    id:          'linkedin_post',
    format:      'linkedin_post',
    label:       'LinkedIn Post',
    description: 'A punchy 150–300 word post built from one strong quote, one insight, and a clear POV.',
    strategy:    'Pulls exact customer language from meeting transcripts + trending angles from ingested sources.',
    icon:        <Share2 className="size-4" />,
    available:   true,
  },
  {
    id:          'newsletter',
    format:      'newsletter',
    label:       'Newsletter',
    description: 'A subscriber newsletter section (400–600 words) with a hook, insight bullets, and a takeaway.',
    strategy:    'Clusters recurring topics from customer conversations into a cohesive narrative.',
    icon:        <Newspaper className="size-4" />,
    available:   true,
  },
  {
    id:          'blog_post',
    format:      'blog_post',
    label:       'Blog Post',
    description: 'Long-form article with evidence pulled from multiple source documents.',
    strategy:    'Clusters related topics across sources to build a well-evidenced narrative.',
    icon:        <BookOpen className="size-4" />,
    available:   true,
  },
  {
    id:          'email_sequence',
    format:      'email_sequence',
    label:       'Cold Email',
    description: 'Targeted outbound email (100–150 words): problem hook → customer proof → one CTA.',
    strategy:    'Extracts objections and pain points from ingested data to write outbound that resonates.',
    icon:        <Mail className="size-4" />,
    available:   true,
  },
  {
    id:          'marketing_email',
    format:      'marketing_email',
    label:       'Marketing Email',
    description: 'Nurture or promotional email (150–200 words) with subject line, value prop, and soft CTA.',
    strategy:    'Uses buying signals and product topics from customer conversations to time the message.',
    icon:        <MailOpen className="size-4" />,
    available:   true,
  },
  {
    id:          'linkedin_ad',
    format:      'linkedin_ad',
    label:       'LinkedIn Ad',
    description: 'Sponsored content copy: punchy 6-word headline, 60–75 word body, and a 4-word CTA.',
    strategy:    'Distils the strongest objection or buying signal into a tight, direct ad message.',
    icon:        <Target className="size-4" />,
    available:   true,
  },
  {
    id:          'battle_card',
    format:      'battle_card',
    label:       'Battle Card',
    description: 'Objection handler and competitive positioning sheet for your sales team.',
    strategy:    'Extracts recurring objections from ingested sources and builds structured responses.',
    icon:        <Shield className="size-4" />,
    available:   true,
  },
]

interface TemplatesTabProps {
  onSelectTemplate: (format: string) => void
}

export function TemplatesTab({ onSelectTemplate }: TemplatesTabProps) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {TEMPLATES.map((tpl) => (
        <div
          key={tpl.id}
          className={`rounded-lg border bg-card p-4 space-y-3 flex flex-col ${
            !tpl.available ? 'opacity-50' : ''
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">{tpl.icon}</span>
            <span className="text-sm font-medium">{tpl.label}</span>
            {!tpl.available && (
              <span className="ml-auto text-xs text-muted-foreground bg-muted rounded-full px-2 py-0.5">
                Soon
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed flex-1">{tpl.description}</p>
          <p className="text-xs text-muted-foreground/70 italic leading-relaxed">{tpl.strategy}</p>
          {tpl.available && (
            <Button
              size="sm"
              variant="outline"
              className="w-full mt-auto"
              onClick={() => onSelectTemplate(tpl.format)}
            >
              Use template
            </Button>
          )}
        </div>
      ))}
    </div>
  )
}
