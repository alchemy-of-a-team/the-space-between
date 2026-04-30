'use client'

import type { Artifact, ArtifactContent } from '@/lib/types'

function ProseRenderer({ content }: { content: ArtifactContent }) {
  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-serif text-stone-800 text-center mb-2">
        {content.title}
      </h1>
      {content.sections.map((section) => (
        <div key={section.sequence}>
          {section.visual_header && (
            <p className="text-sm italic text-stone-500 mb-3 border-l-2 border-stone-300 pl-3">
              {section.visual_header}
            </p>
          )}
          <p className="text-stone-700 leading-relaxed whitespace-pre-wrap">
            {section.body}
          </p>
        </div>
      ))}
      {content.closing && (
        <p className="text-stone-700 leading-relaxed whitespace-pre-wrap mt-8">
          {content.closing}
        </p>
      )}
    </div>
  )
}

function ComicStripRenderer({ content }: { content: ArtifactContent }) {
  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-serif text-stone-800 text-center mb-2">
        {content.title}
      </h1>
      <p className="text-center text-sm text-stone-500 italic">
        {content.sections.length} panels. {content.symbolic_language}.
      </p>
      {content.sections.map((section) => (
        <div
          key={section.sequence}
          className="border-2 border-stone-300 rounded-lg overflow-hidden"
          style={section.accent_color ? { borderColor: section.accent_color } : {}}
        >
          <div className="p-6 bg-stone-50">
            <div className="flex items-start gap-2 mb-3">
              <span
                className="text-xs font-bold px-2 py-1 rounded"
                style={{
                  backgroundColor: section.accent_color || '#d6d3d1',
                  color: '#fff',
                }}
              >
                {section.sequence}
              </span>
              {section.week_range && (
                <span className="text-xs text-stone-400">{section.week_range}</span>
              )}
            </div>
            {section.visual_header && (
              <p className="text-sm italic text-stone-600 mb-4 leading-relaxed">
                {section.visual_header}
              </p>
            )}
            {section.quotes_used?.length > 0 && (
              <blockquote className="border-l-2 border-stone-400 pl-3 my-4">
                <p className="text-stone-800 font-medium">
                  &ldquo;{section.quotes_used[0]}&rdquo;
                </p>
              </blockquote>
            )}
            {section.body && (
              <p className="text-stone-700 text-sm leading-relaxed whitespace-pre-wrap">
                {section.body}
              </p>
            )}
          </div>
          {section.coach_margin_note && (
            <div className="px-6 py-3 bg-amber-50/50 border-t border-stone-200">
              <p className="text-xs text-stone-500 italic">
                <span className="font-medium">Coach&apos;s note:</span>{' '}
                {section.coach_margin_note}
              </p>
            </div>
          )}
        </div>
      ))}
      {content.closing && (
        <p className="text-stone-600 italic text-center text-sm mt-4">
          {content.closing}
        </p>
      )}
    </div>
  )
}

function TimelineRenderer({ content }: { content: ArtifactContent }) {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-serif text-stone-800 text-center mb-2">
        {content.title}
      </h1>
      <div className="relative">
        <div className="absolute left-4 top-0 bottom-0 w-px bg-stone-300" />
        {content.sections.map((section) => (
          <div key={section.sequence} className="relative pl-12 pb-8">
            <div
              className="absolute left-2.5 w-3 h-3 rounded-full border-2 border-white"
              style={{ backgroundColor: section.accent_color || '#a8a29e' }}
            />
            <div className="text-xs text-stone-400 mb-1">{section.week_range}</div>
            {section.visual_header && (
              <p className="text-sm italic text-stone-500 mb-2">{section.visual_header}</p>
            )}
            {section.quotes_used?.length > 0 && (
              <blockquote className="text-stone-700 font-medium text-sm mb-2">
                &ldquo;{section.quotes_used[0]}&rdquo;
              </blockquote>
            )}
            <p className="text-stone-600 text-sm leading-relaxed whitespace-pre-wrap">
              {section.body}
            </p>
          </div>
        ))}
      </div>
      {content.closing && (
        <p className="text-stone-600 leading-relaxed whitespace-pre-wrap pl-12">
          {content.closing}
        </p>
      )}
    </div>
  )
}

function DefaultRenderer({ content }: { content: ArtifactContent }) {
  return <ProseRenderer content={content} />
}

export function ArtifactRenderer({ artifact }: { artifact: Artifact }) {
  const content = artifact.content

  if (!content || !content.sections) {
    // Fallback: render the narrative text directly
    return (
      <div className="bg-white border border-stone-200 rounded-lg p-8">
        <p className="text-stone-700 leading-relaxed whitespace-pre-wrap">
          {artifact.narrative}
        </p>
      </div>
    )
  }

  const medium = (content.medium || artifact.medium || 'prose').toLowerCase()

  return (
    <div className="bg-white border border-stone-200 rounded-lg p-8">
      {medium.includes('comic') ? (
        <ComicStripRenderer content={content} />
      ) : medium.includes('timeline') ? (
        <TimelineRenderer content={content} />
      ) : medium.includes('prose') ? (
        <ProseRenderer content={content} />
      ) : (
        <DefaultRenderer content={content} />
      )}
      <div className="mt-8 pt-4 border-t border-stone-100 flex items-center justify-between text-xs text-stone-400">
        <span>{content.medium} / {content.symbolic_language}</span>
        <span>
          {content.metadata?.entry_count} entries, {content.metadata?.reflection_count} reflections
        </span>
      </div>
    </div>
  )
}
