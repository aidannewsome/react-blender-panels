import { createFileRoute } from '@tanstack/react-router'
import { Demo } from '../Demo'
import contentDiagram from '../../diagrams/content.svg?url'
import joinDiagram from '../../diagrams/join.svg?url'
import resizeDiagram from '../../diagrams/resize.svg?url'
import splitDiagram from '../../diagrams/split.svg?url'
import { Code } from '../code'

export const Route = createFileRoute('/')({ component: Page })

function Page() {
	return (
		<main className="page">
			<article className="docs">
				<section>
					<h2>Demo</h2>
					<div className="body">
						<p>
							Blender-style panels for React. Give it a div to fill and it splits into panels you can
							resize by dragging an edge, and split or join by dragging a corner.
						</p>
						<Demo />
					</div>
				</section>

				<hr className="divider" />

				<section>
					<h2>Getting started</h2>
					<div className="body">
						<p>
							You own the panels. Pass in an array, save the new one it hands back after every drag, and
							pass a function as the child to say what goes inside each one.
						</p>
						<Code lang="tsx">{`npm install react-blender-panels`}</Code>
						<Code lang="tsx">{`import { useState } from 'react'
import { Panels } from 'react-blender-panels'
import type { Panel } from 'react-blender-panels'

// A panel is a rectangle in fractions of the div (0\u20131) plus an id. Add your own
// fields to it and they ride along through every gesture.
interface MyPanel extends Panel {
  kind: keyof typeof CONTENT
}

const CONTENT = {
  viewport: Viewport,
  outliner: Outliner,
  properties: Properties,
}

const [panels, setPanels] = useState<MyPanel[]>([
  { id: 'a', kind: 'viewport',   x: 0,   y: 0,   w: 0.7, h: 1   },
  { id: 'b', kind: 'outliner',   x: 0.7, y: 0,   w: 0.3, h: 0.4 },
  { id: 'c', kind: 'properties', x: 0.7, y: 0.4, w: 0.3, h: 0.6 },
])

<div style={{ width: '100%', height: 500 }}>
  <Panels value={panels} onChange={setPanels}>
    {(panel) => {
      const Content = CONTENT[panel.kind]
      return <Content />
    }}
  </Panels>
</div>`}</Code>
						<figure className="diagram">
							<img src={contentDiagram} alt="Each panel's kind chooses the component rendered inside it" />
						</figure>
					</div>
				</section>

				<hr className="divider" />

				<section>
					<h2>Gestures</h2>
					<div className="body">
						<p>
							Three of them, all on the panels themselves. Splits and joins preview while you drag
							and only commit when you let go. Escape cancels.
						</p>
						<p>Resize: drag a shared edge. Every panel touching that line moves w/ it.</p>
						<figure className="diagram">
							<img src={resizeDiagram} alt="Dragging a shared edge to a new position" />
						</figure>
						<p>
							Split: drag a corner inward. It divides where you release. Sideways gives you a seam
							down the middle, up or down gives you one across.
						</p>
						<figure className="diagram">
							<img src={splitDiagram} alt="Dragging a corner inward to divide a panel in two" />
						</figure>
						<p>Join: drag a corner across into a neighbour. Your panel takes its space.</p>
						<figure className="diagram">
							<img src={joinDiagram} alt="Dragging a corner across into a neighbour to swallow it" />
						</figure>
					</div>
				</section>

				<hr className="divider" />

				<section>
					<h2>Styling</h2>
					<div className="body">
						<p>The panels are yours so their look is your CSS.</p>
						<Code lang="tsx">{`const style = {
  '--rbp-gap': '6px',                        // between panels, never around them
  '--rbp-edge-size': '8px',                // grab reach either side of an edge handle
  '--rbp-corner-size': '12px',               // the corner handle's square

  '--rbp-edge-color': 'rgba(0, 0, 0, 0.3)',  // the line a hovered edge handle shows
  '--rbp-corner-color': 'rgba(0, 0, 0, 0.3)',    // a hovered corner handle; defaults to the edge colour
  '--rbp-preview-border': 'rgba(0, 0, 0, 0.55)', // outline of what a release would do
  '--rbp-preview-fill': 'rgba(0, 0, 0, 0.04)',   // and its wash
  '--rbp-preview-radius': '4px',             // its corners
  '--rbp-preview-fade': '240ms',             // how long it takes to appear

  '--rbp-cursor-corner': 'crosshair',        // over a corner handle
  '--rbp-cursor-resize-x': 'col-resize',     // over a vertical line
  '--rbp-cursor-resize-y': 'row-resize',     // over a horizontal line
  '--rbp-cursor-join-e': 'e-resize',         // about to swallow the neighbour east
  '--rbp-cursor-join-w': 'w-resize',         // west
  '--rbp-cursor-join-n': 'n-resize',         // north
  '--rbp-cursor-join-s': 's-resize',         // south
  '--rbp-cursor-blocked': 'not-allowed',     // this gesture is illegal here
}

<Panels value={panels} onChange={setPanels} style={style}>
  {(panel) => {
    const Content = CONTENT[panel.kind]
    return <Content />
  }}
</Panels>`}</Code>
					</div>
				</section>
		</article>
		</main>
	)
}
