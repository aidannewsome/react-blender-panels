import { createHighlighterCoreSync } from 'shiki/core'
import { createJavaScriptRegexEngine } from 'shiki/engine/javascript'
import css from 'shiki/langs/css.mjs'
import tsx from 'shiki/langs/tsx.mjs'
import githubDark from 'shiki/themes/github-dark-default.mjs'

const THEME = 'github-dark-default'

const highlighter = createHighlighterCoreSync({
	themes: [githubDark],
	langs: [tsx, css],
	engine: createJavaScriptRegexEngine(),
})

/** The block wears the theme's background so the tab and the code share one surface. */
const BACKGROUND = highlighter.getTheme(THEME).bg
const OWN_BACKGROUND = /background-color:[^;"]*;?/

export function Code({ lang, name, children }: { lang: 'tsx' | 'css'; name?: string; children: string }) {
	const html = highlighter.codeToHtml(children, { lang, theme: THEME }).replace(OWN_BACKGROUND, '')
	return (
		<div className="docs-code" style={{ background: BACKGROUND }}>
			{name && (
				<div className="docs-code-head">
					<span className="docs-code-tab">{name}</span>
				</div>
			)}
			<div dangerouslySetInnerHTML={{ __html: html }} />
		</div>
	)
}
