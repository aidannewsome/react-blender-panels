// Exports one SVG per frame from diagrams/diagrams.tldraw, using the tldraw desktop app's local
// server as the renderer. The app must be running with that file open.
import { readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

const SERVER = join(homedir(), 'Library/Application Support/tldraw/server.json')
const OUT = new URL('../diagrams/', import.meta.url)
const DOC = 'diagrams'

// Scale 3 because a browser rasterises an <img> SVG containing a foreignObject at its intrinsic
// size, so the labelled diagrams need pixels to spare.
const SCALE = 3
const PADDING = 8
// tldraw draws rectangles square, so the corner radius the panels wear is added here.
const RADIUS = 8

const { port, token } = JSON.parse(readFileSync(SERVER, 'utf8'))

async function run(path, code) {
	const response = await fetch(`http://localhost:${port}${path}`, {
		method: 'POST',
		headers: { 'content-type': 'text/plain', authorization: `Bearer ${token}` },
		body: code,
	})
	const result = await response.json()
	if (!result.success) throw new Error(result.error ?? JSON.stringify(result))
	return result.result
}

const docs = await run('/api/search', `return await api.getDocs({ name: ${JSON.stringify(DOC)} })`)
if (!docs.length) throw new Error(`${DOC}.tldraw is not open in tldraw`)

const svgs = await run(
	`/api/doc/${docs[0].id}/exec`,
	`const out = {}
	for (const shape of editor.getCurrentPageShapes()) {
		if (shape.type !== 'frame') continue
		const children = editor.getSortedChildIdsForParent(shape.id)
		if (!children.length) continue
		const result = await editor.getSvgString(children, { scale: ${SCALE}, padding: ${PADDING}, background: false })
		out[shape.props.name] = result.svg
	}
	return out`
)

const SQUARE = /M 0 0 L ([\d.]+) 0 L \1 ([\d.]+) L 0 \2 Z/g
// tldraw salts its clip-path ids per export, which would rewrite every file on every run.
const SALT = /_export_\d+_r_[a-z0-9]+_/g

function rounded(_match, width, height) {
	const w = Number(width)
	const h = Number(height)
	const r = Math.min(RADIUS, w / 4, h / 4)
	return (
		`M ${r} 0 L ${w - r} 0 Q ${w} 0 ${w} ${r} L ${w} ${h - r} Q ${w} ${h} ${w - r} ${h} ` +
		`L ${r} ${h} Q 0 ${h} 0 ${h - r} L 0 ${r} Q 0 0 ${r} 0 Z`
	)
}

for (const [name, svg] of Object.entries(svgs)) {
	writeFileSync(new URL(`${name}.svg`, OUT), svg.replace(SQUARE, rounded).replace(SALT, '_'))
	console.log(`${name}.svg`)
}
