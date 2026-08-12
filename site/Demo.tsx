import { useState } from 'react'
import type { Panel } from '../src/index.ts'
import { Panels } from '../src/index.ts'

const START: Panel[] = [
	{ id: 'viewport', x: 0, y: 0, w: 0.7, h: 1 },
	{ id: 'outliner', x: 0.7, y: 0, w: 0.3, h: 0.4 },
	{ id: 'properties', x: 0.7, y: 0.4, w: 0.3, h: 0.6 },
]

/** The page's own voice: handles invisible, and a preview outlined in the text colour. */
const STYLE = {
	'--rbp-gap': '4px',
	'--rbp-edge-color': 'transparent',
	'--rbp-corner-color': 'transparent',
	'--rbp-preview-border': '#1d1d1f',
	'--rbp-preview-radius': '4px',
}

export function Demo() {
	const [panels, setPanels] = useState(START)
	return (
		<div className="demo">
			<Panels value={panels} onChange={setPanels} style={STYLE}>
				{(panel) => <div className="demo-panel">{panel.id}</div>}
			</Panels>
		</div>
	)
}
