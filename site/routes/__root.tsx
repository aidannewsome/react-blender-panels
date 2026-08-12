import type { ReactNode } from 'react'
import { HeadContent, Outlet, Scripts, createRootRoute } from '@tanstack/react-router'
import interCss from '@fontsource-variable/inter/index.css?url'
import siteCss from '../site.css?url'

const TITLE = 'React Blender Panels'
const DESCRIPTION =
	'Blender-style panels for React. Give it a div to fill and it splits into panels you resize by dragging an edge, and split or join by dragging a corner.'
const SITE = 'https://reactblenderpanels.com'
const GITHUB = 'https://github.com/aidannewsome/react-blender-panels'
const NPM = 'https://www.npmjs.com/package/react-blender-panels'

export const Route = createRootRoute({
	head: () => ({
		meta: [
			{ charSet: 'utf-8' },
			{ name: 'viewport', content: 'width=device-width, initial-scale=1' },
			{ title: TITLE },
			{ name: 'description', content: DESCRIPTION },
			{ property: 'og:title', content: TITLE },
			{ property: 'og:description', content: DESCRIPTION },
			{ property: 'og:type', content: 'website' },
			{ property: 'og:url', content: SITE },
			{ property: 'og:image', content: `${SITE}/og.png` },
			{ name: 'twitter:card', content: 'summary_large_image' },
			{ name: 'twitter:image', content: `${SITE}/og.png` },
		],
		links: [
			{ rel: 'stylesheet', href: interCss },
			{ rel: 'stylesheet', href: siteCss },
			{ rel: 'canonical', href: SITE },
		],
	}),
	component: Root,
})

function Root() {
	return (
		<RootDocument>
			<header className="header">
				<span className="site-name">{TITLE}</span>
				<nav className="site-links">
					<a href={NPM} title="npm" aria-label="npm" rel="noreferrer">
						<NpmMark />
					</a>
					<a href={GITHUB} title="GitHub" aria-label="GitHub" rel="noreferrer">
						<GitHubMark />
					</a>
				</nav>
				{/* The page's first rule belongs to the bar, so it sticks with it. */}
				<hr className="divider" />
			</header>
			<Outlet />
		</RootDocument>
	)
}

function GitHubMark() {
	return (
		<svg viewBox="0 0 16 16" width="18" height="18" fill="currentColor" aria-hidden>
			<path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.4 7.4 0 0 1 2-.27c.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
		</svg>
	)
}

function NpmMark() {
	return (
		<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden>
			<path d="M1.763 0C.786 0 0 .786 0 1.763v20.474C0 23.214.786 24 1.763 24h20.474c.977 0 1.763-.786 1.763-1.763V1.763C24 .786 23.214 0 22.237 0zM5.13 5.323l13.837.019-.009 13.836h-3.464l.01-10.382h-3.456L12.04 19.17H5.113z" />
		</svg>
	)
}

function RootDocument({ children }: { children: ReactNode }) {
	return (
		<html lang="en">
			<head>
				<HeadContent />
			</head>
			<body>
				{children}
				<Scripts />
			</body>
		</html>
	)
}
