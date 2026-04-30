'use client'

/* eslint-disable @next/next/no-img-element */
import type { Artifact, ArtifactContent } from '@/lib/types'

function SectionImage({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="my-4 rounded-lg overflow-hidden">
      <img src={src} alt={alt} className="w-full h-auto" />
    </div>
  )
}

function ProseRenderer({ content }: { content: ArtifactContent }) {
  return (
    <div className="space-y-10">
      <h1 className="text-3xl font-serif text-stone-800 text-center mb-2">
        {content.title}
      </h1>
      {content.sections.map((section) => (
        <div key={section.sequence}>
          {section.image_url && (
            <SectionImage src={section.image_url} alt={section.visual_header || `Section ${section.sequence}`} />
          )}
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
    <div className="space-y-6">
      <h1 className="text-3xl font-serif text-stone-800 text-center mb-2">
        {content.title}
      </h1>
      <p className="text-center text-sm text-stone-500 italic">
        {content.sections.length} panels. {content.symbolic_language}.
      </p>
      {content.sections.map((section) => (
        <div
          key={section.sequence}
          className="border-2 rounded-lg overflow-hidden"
          style={{ borderColor: section.accent_color || '#d6d3d1' }}
        >
          {/* Panel image */}
          {section.image_url && (
            <SectionImage src={section.image_url} alt={section.visual_header || `Panel ${section.sequence}`} />
          )}

          <div className="p-5">
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

            {/* Quote as dialogue */}
            {section.quotes_used?.length > 0 && (
              <blockquote className="border-l-3 pl-3 my-3" style={{ borderColor: section.accent_color || '#a8a29e' }}>
                <p className="text-stone-800 font-medium text-lg">
                  &ldquo;{section.quotes_used[0]}&rdquo;
                </p>
              </blockquote>
            )}

            {/* Scene description if no image */}
            {!section.image_url && section.visual_header && (
              <p className="text-sm italic text-stone-500 mb-3 leading-relaxed">
                {section.visual_header}
              </p>
            )}

            {section.body && (
              <p className="text-stone-600 text-sm leading-relaxed whitespace-pre-wrap">
                {section.body}
              </p>
            )}
          </div>

          {/* Coach margin note */}
          {section.coach_margin_note && (
            <div className="px-5 py-3 bg-amber-50/70 border-t border-stone-200">
              <p className="text-xs text-stone-500 italic font-serif">
                <span className="font-medium not-italic text-stone-600">Coach&apos;s margin note:</span>{' '}
                {section.coach_margin_note}
              </p>
            </div>
          )}
        </div>
      ))}
      {content.closing && (
        <p className="text-stone-600 italic text-center text-sm mt-6">
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
            {section.image_url && (
              <div className="mb-3 rounded-lg overflow-hidden max-w-sm">
                <img src={section.image_url} alt={section.visual_header || ''} className="w-full h-auto" />
              </div>
            )}
            {!section.image_url && section.visual_header && (
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
