import { createHighlighterCoreSync } from 'shiki/core'
import { createJavaScriptRegexEngine } from 'shiki/engine/javascript'
import css from 'shiki/langs/css.mjs'
import tsx from 'shiki/langs/tsx.mjs'
import githubLight from 'shiki/themes/github-light.mjs'

const highlighter = createHighlighterCoreSync({
	themes: [githubLight],
	langs: [tsx, css],
	engine: createJavaScriptRegexEngine(),
})

export function Code({ lang, children }: { lang: 'tsx' | 'css'; children: string }) {
	const html = highlighter.codeToHtml(children, { lang, theme: 'github-light' })
	return <div className="docs-code" dangerouslySetInnerHTML={{ __html: html }} />
}
