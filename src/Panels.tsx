import type { CSSProperties, PointerEvent as ReactPointerEvent, ReactNode } from 'react'
import { useEffect, useMemo, useReducer, useRef } from 'react'
import { getEdgeHandles } from './handles.ts'
import type { EdgeHandle } from './handles.ts'
import type { Panel, Rect } from './panel.ts'
import { Root } from './state/Root.ts'


const CORNERS = ['nw', 'ne', 'sw', 'se'] as const

// Far enough that a slipped click never previews, close enough that a real drag feels immediate.
const DRAG_THRESHOLD = 3

// Fractions arrive as 0.30000000000000004, so edges are compared with room to spare.
const TOLERANCE = 1e-6

// The sizes and colours the library draws with. Each reads a custom property, so all of it stays
// yours to change from the style prop or your own CSS.
const EDGE_THICKNESS = 'calc(var(--rbp-gap, 0px) + var(--rbp-edge-size, 8px))'
const CORNER_SIZE = 'var(--rbp-corner-size, 12px)'
const HIGHLIGHT = 'var(--rbp-edge-color, rgba(0, 0, 0, 0.3))'

// What each cursor falls back to when no custom property is set.
const CURSORS: Record<string, string> = {
	'resize-x': 'col-resize',
	'resize-y': 'row-resize',
	corner: 'crosshair',
	blocked: 'not-allowed',
	'join-e': 'e-resize',
	'join-w': 'w-resize',
	'join-n': 'n-resize',
	'join-s': 's-resize',
} as const

type Corner = (typeof CORNERS)[number]

export type { Panel, Rect } from './panel.ts'

export interface PanelsProps<P extends Panel = Panel> {
	/** The panels. They tile the div exactly: the fractions add up, nothing overlaps. */
	value: readonly P[]
	/** The next panels after a gesture: save it, render from it. */
	onChange: (panels: P[]) => void
	/** What to render inside a panel. Runs once per panel. */
	children: (panel: P) => ReactNode
	/** No panel is dragged or split below this many pixels. */
	minSize?: number
	className?: string
	style?: CSSProperties & Record<`--${string}`, string | number>
}

export function Panels<P extends Panel>({
	value,
	onChange,
	children,
	minSize = 24,
	className,
	style,
}: PanelsProps<P>) {
	const root = useRef<HTMLDivElement>(null)
	const [, rerender] = useReducer((count: number) => count + 1, 0)

	// The states read the world through this, so they never hold a stale layout.
	const latest = useRef({ value, onChange, minSize })
	latest.current = { value, onChange, minSize }

	const machine = useMemo(
		() =>
			new Root({
				getPanels: () => latest.current.value,
				getMinimum: () => {
					const box = root.current?.getBoundingClientRect()
					const size = latest.current.minSize
					return { x: size / (box?.width || 1), y: size / (box?.height || 1) }
				},
				change: (panels) => latest.current.onChange(panels as P[]),
				update: rerender,
			}),
		[]
	)

	/** Client coordinates in fractions of the container, which is all a state ever sees. */
	const toFractions = (event: { clientX: number; clientY: number }) => {
		const box = root.current!.getBoundingClientRect()
		return { x: (event.clientX - box.left) / box.width, y: (event.clientY - box.top) / box.height }
	}
	const toPointer = (event: { clientX: number; clientY: number; ctrlKey: boolean; shiftKey: boolean }) => ({
		at: toFractions(event),
		ctrlKey: event.ctrlKey,
		shiftKey: event.shiftKey,
	})

	/** A drag lives on the window, because the pointer leaves the target almost immediately. */
	const beginDrag = () => {
		const move = (event: globalThis.PointerEvent) => machine.pointerMove(toPointer(event))
		const up = (event: globalThis.PointerEvent) => {
			machine.pointerUp(toPointer(event))
			stop()
		}
		const key = (event: KeyboardEvent) => machine.keyDown(event)
		const stop = () => {
			window.removeEventListener('pointermove', move)
			window.removeEventListener('pointerup', up)
			window.removeEventListener('pointercancel', up)
			window.removeEventListener('keydown', key, true)
			document.body.style.userSelect = ''
		}
		document.body.style.userSelect = 'none'
		window.addEventListener('pointermove', move)
		window.addEventListener('pointerup', up)
		window.addEventListener('pointercancel', up)
		window.addEventListener('keydown', key, true)
	}

	// While a gesture runs, its cursor has to beat every element under the pointer, and the handles
	// and corners all carry one of their own. A rule of our own, for the length of the drag, wins.
	const cursor = machine.getCursor()
	const dragging = machine.isBusy
	useEffect(() => {
		if (!cursor) return
		const resolved = getCursor(root.current, cursor)
		if (!dragging) {
			document.body.style.cursor = resolved
			return () => {
				document.body.style.cursor = ''
			}
		}
		const sheet = document.createElement('style')
		sheet.textContent = `* { cursor: ${resolved} !important }`
		document.head.append(sheet)
		return () => sheet.remove()
	}, [cursor, dragging])

	const previews = machine.previews()

	return (
		<div
			ref={root}
			className={className ? `rbp-panels ${className}` : 'rbp-panels'}
			style={{ ...ROOT, ...style }}
		>
			{value.map((panel) => (
				<div key={panel.id} className="rbp-panel" data-rbp-panel={panel.id} style={getPanelStyle(panel)}>
					{children(panel)}
				</div>
			))}

			{getEdgeHandles(value).map((handle) => (
				<div
					key={handle.id}
					className="rbp-edge-handle"
					data-axis={handle.axis}
					style={getEdgeHandleStyle(handle)}
					onPointerEnter={() => machine.hoverEdge(handle, handle.id)}
					onPointerLeave={() => machine.unhover()}
					onPointerDown={(event) => {
						if (event.button !== 0) return
						event.preventDefault()
						machine.grabEdge(handle, handle.id, toFractions(event))
						beginDrag()
					}}
				>
					{machine.target === handle.id && <div className="rbp-line" style={getLineStyle(handle.axis)} />}
				</div>
			))}

			{previews.map((rect, index) => (
				<div
					key={`preview${index}`}
					ref={fadeIn}
					className="rbp-preview"
					style={{ ...getPanelStyle(rect), ...PREVIEW }}
				/>
			))}

			{value.flatMap((panel) =>
				CORNERS.map((corner) => {
					const key = `${panel.id}${corner}`
					return (
						<div
							key={key}
							className="rbp-corner-handle"
							data-corner={corner}
							style={getCornerStyle(panel, corner, machine.isMarked(key))}
							aria-hidden
							onPointerEnter={() => machine.hoverCorner(panel, key)}
							onPointerLeave={() => machine.unhover()}
							onPointerDown={(event) => {
								if (event.button !== 0) return
								event.preventDefault()
								machine.grabCorner(panel, key, toFractions(event))
								beginDrag()
							}}
						/>
					)
				})
			)}
		</div>
	)
}

/** The cursor a custom property asks for, resolved on the container so overrides are honoured. */
function getCursor(element: HTMLElement | null, name: string): string {
	const declared = element ? getComputedStyle(element).getPropertyValue(`--rbp-cursor-${name}`).trim() : ''
	return declared || CURSORS[name] || 'default'
}

/* ------------------------------------------- styles -------------------------------------------
   Everything the library draws, inline, so the package ships no stylesheet. A handle and a corner
   are hit areas: sized for a pointer, invisible until hovered. The line is the thin mark a hovered
   edge shows.                                                                                   */

/** The library's own div, holding every panel. */
const ROOT: CSSProperties = { position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }

/**
 * A panel's rectangle. Grid, so a single child fills it without needing a height of its own, and
 * minmax(0, 1fr) so that child may shrink past its own content instead of spilling out of the
 * panel: a grid item's minimum is its content unless you say otherwise.
 */
function getPanelStyle(panel: Rect): CSSProperties {
	const { left, top, right, bottom } = getGapInsets(panel)
	return {
		position: 'absolute',
		display: 'grid',
		gridTemplate: 'minmax(0, 1fr) / minmax(0, 1fr)',
		left: `calc(${panel.x * 100}% + ${left})`,
		top: `calc(${panel.y * 100}% + ${top})`,
		width: `calc(${panel.w * 100}% - ${left} - ${right})`,
		height: `calc(${panel.h * 100}% - ${top} - ${bottom})`,
	}
}

/** The grab strip: as long as the handle, and a little wider than the gap. */
function getEdgeHandleStyle(handle: EdgeHandle): CSSProperties {
	const shared: CSSProperties = { position: 'absolute', zIndex: 1, touchAction: 'none' }
	const along = `${handle.position * 100}%`
	const from = `${handle.from * 100}%`
	const size = `${(handle.to - handle.from) * 100}%`
	return handle.axis === 'x'
		? {
				...shared,
				cursor: 'var(--rbp-cursor-resize-x, col-resize)',
				left: along,
				top: from,
				height: size,
				width: EDGE_THICKNESS,
				transform: 'translateX(-50%)',
			}
		: {
				...shared,
				cursor: 'var(--rbp-cursor-resize-y, row-resize)',
				top: along,
				left: from,
				width: size,
				height: EDGE_THICKNESS,
				transform: 'translateY(-50%)',
			}
}

/** What a hovered handle shows: the line itself, centred in the strip. */
function getLineStyle(axis: 'x' | 'y'): CSSProperties {
	const shared: CSSProperties = {
		position: 'absolute',
		pointerEvents: 'none',
		background: HIGHLIGHT,
		borderRadius: 'var(--rbp-line-radius, 0)',
	}
	return axis === 'x'
		? { ...shared, top: 0, bottom: 0, left: '50%', width: 2, transform: 'translateX(-50%)' }
		: { ...shared, left: 0, right: 0, top: '50%', height: 2, transform: 'translateY(-50%)' }
}

/** What a release would produce: the same rectangle a panel would get, in a lighter voice. */
const PREVIEW: CSSProperties = {
	zIndex: 3,
	pointerEvents: 'none',
	boxSizing: 'border-box',
	border: '1px solid var(--rbp-preview-border, rgba(0, 0, 0, 0.55))',
	background: 'var(--rbp-preview-fill, rgba(0, 0, 0, 0.04))',
	borderRadius: 'var(--rbp-preview-radius, 0)',
}

/**
 * Previews fade in, never out: appearing softly reads as a suggestion, while disappearing softly
 * would lag behind a decision you already made. Animated here rather than in CSS because the
 * package ships no stylesheet, and cancelled for anyone who asked for less motion.
 */
function fadeIn(element: HTMLDivElement | null) {
	if (!element) return
	const duration = getFadeDuration(element)
	if (duration <= 0 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
	element.animate({ opacity: [0, 1] }, { duration, easing: 'ease' })
}

function getFadeDuration(element: HTMLElement): number {
	const declared = getComputedStyle(element).getPropertyValue('--rbp-preview-fade').trim() || '240ms'
	const value = Number.parseFloat(declared)
	if (Number.isNaN(value)) return 0
	return declared.endsWith('ms') ? value : value * 1000
}

/** A corner zone, tucked inside the panel it belongs to, marking itself while hovered. */
function getCornerStyle(panel: Panel, corner: Corner, marked: boolean): CSSProperties {
	const { left, top, right, bottom } = getGapInsets(panel)
	const west = `calc(${panel.x * 100}% + ${left})`
	const north = `calc(${panel.y * 100}% + ${top})`
	const east = `calc(${(panel.x + panel.w) * 100}% - ${right} - ${CORNER_SIZE})`
	const south = `calc(${(panel.y + panel.h) * 100}% - ${bottom} - ${CORNER_SIZE})`
	return {
		position: 'absolute',
		zIndex: 2,
		touchAction: 'none',
		cursor: 'var(--rbp-cursor-corner, crosshair)',
		width: CORNER_SIZE,
		height: CORNER_SIZE,
		left: corner === 'nw' || corner === 'sw' ? west : east,
		top: corner === 'nw' || corner === 'ne' ? north : south,
		borderRadius: 'var(--rbp-corner-radius, 0)',
		// One highlight colour by default: a corner only differs if you deliberately set it.
		background: marked ? `var(--rbp-corner-color, ${HIGHLIGHT})` : 'transparent',
	}
}

/**
 * Half the gap on every side that has a neighbour, and nothing on the sides that touch the
 * container, so the gap only ever appears between panels.
 */
function getGapInsets({ x, y, w, h }: Rect) {
	const getHalfGap = (interior: boolean) => (interior ? 'var(--rbp-gap, 0px) / 2' : '0px')
	return {
		left: getHalfGap(x > TOLERANCE),
		top: getHalfGap(y > TOLERANCE),
		right: getHalfGap(x + w < 1 - TOLERANCE),
		bottom: getHalfGap(y + h < 1 - TOLERANCE),
	}
}
