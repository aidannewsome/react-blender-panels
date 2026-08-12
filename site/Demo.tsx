import { useState } from 'react'
import type { Panel } from '../src/index.ts'
import { Panels } from '../src/index.ts'

const START: Panel[] = [
	{ id: 'panel-a', x: 0, y: 0, w: 0.7, h: 1 },
	{ id: 'panel-b', x: 0.7, y: 0, w: 0.3, h: 0.4 },
	{ id: 'panel-c', x: 0.7, y: 0.4, w: 0.3, h: 0.6 },
]

/** The page's own voice: handles invisible, and a preview outlined in the text colour. */
const STYLE = {
	'--rbp-gap': '4px',
	'--rbp-edge-color': 'transparent',
	'--rbp-corner-color': 'transparent',
	'--rbp-preview-border': '#1d1d1f',
	'--rbp-preview-radius': '4px',
}

/** Two decimals, no trailing zeroes: 0.7 stays 0.7 and 0.35 stays 0.35. */
function round(value: number): string {
	return String(Math.round(value * 100) / 100)
}

/** An id as the component it would be: panel-a reads <PanelA />, panel-4 reads <Panel4 />. */
function component(id: string): string {
	const name = id.replace(/(^|[-_])(\w)/g, (_, __, letter: string) => letter.toUpperCase())
	return `<${name} />`
}

export function Demo() {
	const [panels, setPanels] = useState(START)
	return (
		<div className="demo">
			<Panels value={panels} onChange={setPanels} style={STYLE}>
				{(panel) => (
					<div className="demo-panel">
						<span>{component(panel.id)}</span>
						<span>
							x: {round(panel.x)} y: {round(panel.y)}
						</span>
						<span>
							w: {round(panel.w)} h: {round(panel.h)}
						</span>
					</div>
				)}
			</Panels>
		</div>
	)
}
