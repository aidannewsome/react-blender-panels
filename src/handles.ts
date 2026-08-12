import type { Panel } from './panel.ts'

/** What you grab, in fractions: it sits at `position` on `axis` and runs `from` → `to`. */
export interface EdgeHandle {
	/** Stable while the edge moves, because the panel leading it does not change. */
	id: string
	axis: 'x' | 'y'
	position: number
	from: number
	to: number
}

/** One panel's leading side: the stretch of a handle that panel is responsible for. */
interface PanelEdge {
	from: number
	to: number
	panelId: string
}

// Fractions arrive as 0.30000000000000004, so positions are compared with room to spare.
const TOLERANCE = 1e-6

/**
 * A vertical edge moves in x and runs along y; a horizontal edge is the other way round. Naming
 * those four fields once is what lets everything below be written a single time instead of twice.
 */
function getAxes(axis: 'x' | 'y') {
	return axis === 'x'
		? ({ moveAxis: 'x', moveSize: 'w', alongAxis: 'y', alongSize: 'h' } as const)
		: ({ moveAxis: 'y', moveSize: 'h', alongAxis: 'x', alongSize: 'w' } as const)
}

/**
 * Every handle the panels offer, derived rather than stored. A panel's leading side counts unless
 * it sits on the container's own wall, and sides that line up and touch merge into one handle, so
 * the whole stretch moves as a piece. Two panels aligned either side of a third do NOT merge,
 * because the stretch is broken between them and there is nothing to drag in the middle.
 */
export function getEdgeHandles(panels: readonly Panel[]): EdgeHandle[] {
	return [...getEdgeHandlesAlong(panels, 'x'), ...getEdgeHandlesAlong(panels, 'y')]
}

function getEdgeHandlesAlong(panels: readonly Panel[], axis: 'x' | 'y'): EdgeHandle[] {
	const found: EdgeHandle[] = []
	for (const [position, panelEdges] of groupPanelEdgesByPosition(panels, axis)) {
		found.push(...mergeTouching(panelEdges, axis, position))
	}
	return found
}

/** Each panel's leading side, filed under the position it sits at. Sides on the wall are skipped. */
function groupPanelEdgesByPosition(panels: readonly Panel[], axis: 'x' | 'y'): Map<number, PanelEdge[]> {
	const { moveAxis, alongAxis, alongSize } = getAxes(axis)
	const grouped = new Map<number, PanelEdge[]>()

	for (const panel of panels) {
		const position = panel[moveAxis]
		if (position <= TOLERANCE) continue
		// One panel may hold 0.7 and its neighbour 0.7000000000000001: the same edge, so the same key.
		const key = [...grouped.keys()].find((k) => Math.abs(k - position) < TOLERANCE) ?? position
		const found = grouped.get(key) ?? []
		found.push({ from: panel[alongAxis], to: panel[alongAxis] + panel[alongSize], panelId: panel.id })
		grouped.set(key, found)
	}
	return grouped
}

/** Panel edges at one position, joined where they touch: one handle per unbroken stretch. */
function mergeTouching(panelEdges: readonly PanelEdge[], axis: 'x' | 'y', position: number): EdgeHandle[] {
	const sorted = [...panelEdges].sort((a, b) => a.from - b.from)
	const merged: EdgeHandle[] = []
	let stretch = sorted[0]!

	const finish = () =>
		merged.push({ id: `${axis}:${stretch.panelId}`, axis, position, from: stretch.from, to: stretch.to })

	for (const panelEdge of sorted.slice(1)) {
		const touches = panelEdge.from <= stretch.to + TOLERANCE
		if (touches) stretch = { ...stretch, to: Math.max(stretch.to, panelEdge.to) }
		else {
			finish()
			stretch = panelEdge
		}
	}
	finish()
	return merged
}

/**
 * Move a handle to `toPosition`, keeping the tiling exact: panels that start on it follow it,
 * panels that end on it grow or shrink to meet it, and everything else is untouched. Clamped so no
 * panel on the handle drops below `minimum`, and only panels along this handle's own stretch move —
 * a handle elsewhere at the same position stays put.
 */
export function moveEdgeHandle<P extends Panel>(
	panels: readonly P[],
	handle: EdgeHandle,
	toPosition: number,
	minimum: number
): P[] {
	const { moveAxis, moveSize, alongAxis, alongSize } = getAxes(handle.axis)

	const isAlongHandle = (panel: P) =>
		panel[alongAxis] + panel[alongSize] > handle.from + TOLERANCE && panel[alongAxis] < handle.to - TOLERANCE
	const startsOnHandle = (panel: P) =>
		Math.abs(panel[moveAxis] - handle.position) < TOLERANCE && isAlongHandle(panel)
	const endsOnHandle = (panel: P) =>
		Math.abs(panel[moveAxis] + panel[moveSize] - handle.position) < TOLERANCE && isAlongHandle(panel)

	let clamped = toPosition
	for (const panel of panels) {
		if (startsOnHandle(panel)) clamped = Math.min(clamped, panel[moveAxis] + panel[moveSize] - minimum)
		if (endsOnHandle(panel)) clamped = Math.max(clamped, panel[moveAxis] + minimum)
	}

	// Every panel is rewritten from the same clamped number, so none of them can disagree.
	return panels.map((panel) => {
		if (startsOnHandle(panel)) {
			return { ...panel, [moveAxis]: clamped, [moveSize]: panel[moveAxis] + panel[moveSize] - clamped }
		}
		if (endsOnHandle(panel)) return { ...panel, [moveSize]: clamped - panel[moveAxis] }
		return panel
	})
}
