import { useState } from 'react'
import type { Panel } from '../src/index.ts'
import { Panels } from '../src/index.ts'

const START: Panel[] = [
	{ id: 'viewport', x: 0, y: 0, w: 0.7, h: 1 },
	{ id: 'outliner', x: 0.7, y: 0, w: 0.3, h: 0.4 },
	{ id: 'properties', x: 0.7, y: 0.4, w: 0.3, h: 0.6 },
]

const LOOKS = {
	/** The page's own voice: a gap, a visible line, and a preview outlined in the text colour. */
	handles: {
		'--rbp-gap': '4px',
		'--rbp-edge-color': 'rgba(0, 0, 0, 0.25)',
		'--rbp-preview-border': '#1d1d1f',
		'--rbp-preview-radius': '4px',
	},
	/** The same, w/ nothing to see. */
	bare: {
		'--rbp-gap': '4px',
		'--rbp-edge-color': 'transparent',
		'--rbp-corner-color': 'transparent',
		'--rbp-preview-border': '#1d1d1f',
		'--rbp-preview-radius': '4px',
	},
}

export function Demo({ look = 'handles' }: { look?: keyof typeof LOOKS }) {
	const [panels, setPanels] = useState(START)
	return (
		<div className="demo">
			<Panels value={panels} onChange={setPanels} style={LOOKS[look]}>
				{(panel) => <div className="demo-panel">{panel.id}</div>}
			</Panels>
		</div>
	)
}
