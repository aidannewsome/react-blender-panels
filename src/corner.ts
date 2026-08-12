import type { Panel, Rect } from './panel.ts'

// Fractions arrive as 0.30000000000000004, so sides are compared with room to spare.
const TOLERANCE = 1e-6

/** Which way a split divides: `row` puts the new panel beside it, `col` below it. */
export type Direction = 'row' | 'col'

/**
 * The two rectangles a split would leave behind, dividing `panel` at `fraction` of its own width
 * or height. Together they cover exactly what the panel covered, so previewing them and committing
 * them show the same thing.
 */
export function getSplitRects(panel: Rect, direction: Direction, fraction: number): [Rect, Rect] {
	if (direction === 'row') {
		const width = panel.w * fraction
		return [
			{ ...panel, w: width },
			{ ...panel, x: panel.x + width, w: panel.w - width },
		]
	}
	const height = panel.h * fraction
	return [
		{ ...panel, h: height },
		{ ...panel, y: panel.y + height, h: panel.h - height },
	]
}

/**
 * Where along the panel a split would land, from a pointer in container fractions. Clamped so
 * neither side is born smaller than `minimum`, which is a fraction of the panel, not the container.
 */
export function getSplitFraction(panel: Rect, direction: Direction, pointer: number, minimum: number): number {
	const within = direction === 'row' ? (pointer - panel.x) / panel.w : (pointer - panel.y) / panel.h
	return Math.min(1 - minimum, Math.max(minimum, within))
}

/** Which way a corner drag is heading: whichever axis it has travelled furthest along. */
export function getDirection(dx: number, dy: number): Direction {
	return Math.abs(dx) >= Math.abs(dy) ? 'row' : 'col'
}

/** Whether the pointer is still inside the panel it started in, in container fractions. */
export function isInside(panel: Panel, x: number, y: number): boolean {
	return x >= panel.x && x <= panel.x + panel.w && y >= panel.y && y <= panel.y + panel.h
}

/**
 * Whether `into` may swallow `target`: they must touch and share a whole side. Anything else would
 * leave a hole or a panel that is no longer a rectangle.
 */
export function canJoin(into: Panel, target: Panel): boolean {
	const near = (a: number, b: number) => Math.abs(a - b) < TOLERANCE
	const touchesSideways = near(into.x + into.w, target.x) || near(target.x + target.w, into.x)
	if (touchesSideways && near(into.y, target.y) && near(into.h, target.h)) return true
	const touchesVertically = near(into.y + into.h, target.y) || near(target.y + target.h, into.y)
	return touchesVertically && near(into.x, target.x) && near(into.w, target.w)
}

/** The rectangle left behind once `into` has swallowed `target`. */
export function getJoinRect(into: Panel, target: Panel): Rect {
	const x = Math.min(into.x, target.x)
	const y = Math.min(into.y, target.y)
	return {
		x,
		y,
		w: Math.max(into.x + into.w, target.x + target.w) - x,
		h: Math.max(into.y + into.h, target.y + target.h) - y,
	}
}

/** Which way the swallowed panel lies, so the cursor can point at it. */
export function getJoinDirection(into: Panel, target: Panel): 'e' | 'w' | 'n' | 's' {
	const dx = target.x + target.w / 2 - (into.x + into.w / 2)
	const dy = target.y + target.h / 2 - (into.y + into.h / 2)
	if (Math.abs(dx) >= Math.abs(dy)) return dx > 0 ? 'e' : 'w'
	return dy > 0 ? 's' : 'n'
}

/** The panel under a pointer given in container fractions, if any. */
export function getPanelAt<P extends Panel>(panels: readonly P[], x: number, y: number): P | undefined {
	return panels.find((panel) => isInside(panel, x, y))
}

/** A pointer, in fractions of the container. */
export interface Point {
	x: number
	y: number
}

/**
 * What a corner drag would do if you let go now — the decision, not the picture. Both the preview
 * and the commit are read from this, so what you see and what you get cannot drift apart.
 */
export type Outcome =
	| { kind: 'none' }
	| { kind: 'split'; direction: Direction; fraction: number }
	| { kind: 'join'; targetId: string; towards: 'e' | 'w' | 'n' | 's' }

export const NONE: Outcome = { kind: 'none' }

// A slipped click must not preview, but a real drag should show one straight away. A fraction of
// the container, so it is a few pixels whatever the size.
const THRESHOLD = 0.004

/**
 * What a corner drag would do from where it began to where the pointer is now: pulled inward it
 * divides its own panel, taken across onto a neighbour that shares a whole side it swallows it,
 * and anywhere else it does nothing.
 */
export function getOutcome(
	panel: Panel,
	panels: readonly Panel[],
	minimum: Point,
	origin: Point,
	pointer: Point
): Outcome {
	const travelled = Math.max(Math.abs(pointer.x - origin.x), Math.abs(pointer.y - origin.y))
	if (travelled < THRESHOLD) return NONE

	if (!isInside(panel, pointer.x, pointer.y)) {
		const target = getPanelAt(panels, pointer.x, pointer.y)
		if (!target || target.id === panel.id || !canJoin(panel, target)) return NONE
		return { kind: 'join', targetId: target.id, towards: getJoinDirection(panel, target) }
	}

	const direction = getDirection(pointer.x - origin.x, pointer.y - origin.y)
	const [size, limit] = direction === 'row' ? [panel.w, minimum.x] : [panel.h, minimum.y]
	if (size < 2 * limit) return NONE

	const fraction = getSplitFraction(panel, direction, direction === 'row' ? pointer.x : pointer.y, limit / size)
	return { kind: 'split', direction, fraction }
}

/** The rectangles to draw while the drag is deciding. */
export function getOutcomeRects(panel: Panel, panels: readonly Panel[], outcome: Outcome): Rect[] {
	if (outcome.kind === 'split') return getSplitRects(panel, outcome.direction, outcome.fraction)
	if (outcome.kind === 'join') {
		const target = panels.find((other) => other.id === outcome.targetId)
		// The panel you would swallow is drawn again on top of the merged rectangle, so a second
		// wash marks which neighbour is about to go.
		return target ? [getJoinRect(panel, target), { x: target.x, y: target.y, w: target.w, h: target.h }] : []
	}
	return []
}

/**
 * The layout a release would leave behind. A split keeps the original panel and adds one beside or
 * below it, carrying every field the original had; a join removes the neighbour and grows the panel
 * over its space.
 */
export function applyOutcome<P extends Panel>(
	panels: readonly P[],
	panel: P,
	outcome: Outcome,
	newId: string
): P[] {
	if (outcome.kind === 'split') {
		const [first, second] = getSplitRects(panel, outcome.direction, outcome.fraction)
		return panels.flatMap((current) =>
			current.id === panel.id ? [{ ...panel, ...first }, { ...panel, ...second, id: newId }] : [current]
		)
	}
	if (outcome.kind === 'join') {
		const target = panels.find((other) => other.id === outcome.targetId)
		if (!target) return [...panels]
		const joined = getJoinRect(panel, target)
		return panels
			.filter((current) => current.id !== target.id)
			.map((current) => (current.id === panel.id ? { ...current, ...joined } : current))
	}
	return [...panels]
}

/** The first `panel-N` no one is using. */
export function getNewPanelId(panels: readonly Panel[]): string {
	let n = panels.length + 1
	while (panels.some((panel) => panel.id === `panel-${n}`)) n++
	return `panel-${n}`
}
