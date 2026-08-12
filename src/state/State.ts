import type { Point } from '../corner.ts'
import type { Panel, Rect } from '../panel.ts'

export type { Point }

/** What a state can ask of the world outside it. Fresh every render, so states never hold stale panels. */
export interface Context {
	getPanels(): readonly Panel[]
	/** The smallest a panel may be, as a fraction of the container, per axis. */
	getMinimum(): Point
	change(panels: Panel[]): void
	/** Tell React something visible changed. */
	update(): void
}

/** A pointer event, already converted into fractions of the container. */
export interface Pointer {
	at: Point
	ctrlKey: boolean
	shiftKey: boolean
}

type Handler = 'onPointerDown' | 'onPointerMove' | 'onPointerUp' | 'onKeyDown'

/**
 * One node of the state tree. A state owns the logic for the moment it describes: what to draw,
 * which cursor to ask for, and what each event means while it is current. Anything it does not
 * handle bubbles to its parent, which is how Escape can cancel every gesture from one place.
 *
 * To add a state: extend this, implement only the handlers you care about, and add it to a parent.
 */
export abstract class State {
	parent: State | null = null
	children: Record<string, State> = {}
	current: State | null = null

	readonly id: string
	readonly context: Context

	// Written out rather than declared in the parameter list: parameter properties emit code, and
	// this package stays runnable by anything that only strips types, Node included.
	constructor(id: string, context: Context) {
		this.id = id
		this.context = context
	}

	/** Register children. The first becomes the state entered by default. */
	protected add(...states: State[]): this {
		for (const state of states) {
			state.parent = this
			this.children[state.id] = state
		}
		this.current ??= states[0] ?? null
		return this
	}

	/** Leave the current child and enter another, running their exit and enter hooks. */
	transition(id: string, info?: unknown): void {
		const next = this.children[id]
		if (!next) throw new Error(`${this.id} has no state called ${id}`)
		if (this.current === next) {
			next.onEnter?.(info)
			return this.context.update()
		}
		this.current?.onExit?.()
		this.current = next
		next.onEnter?.(info)
		this.context.update()
	}

	/** The chain from here down to the deepest active state. */
	private get branch(): State[] {
		const chain: State[] = []
		for (let state: State | null = this; state; state = state.current) chain.push(state)
		return chain
	}

	/** Deepest state first; a handler returning true stops it bubbling. */
	dispatch(handler: Handler, event: never): void {
		for (const state of this.branch.reverse()) {
			const handle = state[handler] as ((event: never) => boolean | void) | undefined
			if (handle?.call(state, event) === true) return
		}
	}

	/** What the active branch wants drawn, deepest first. */
	getPreview(): Rect[] {
		for (const state of this.branch.reverse()) {
			const rects = state.previewRects()
			if (rects.length) return rects
		}
		return []
	}

	/** The cursor the active branch asks for, by custom-property name. */
	getCursor(): string | null {
		for (const state of this.branch.reverse()) {
			const cursor = state.cursorName()
			if (cursor) return cursor
		}
		return null
	}

	protected previewRects(): Rect[] {
		return []
	}

	protected cursorName(): string | null {
		return null
	}

	onEnter?(info?: unknown): void
	onExit?(): void
	onPointerDown?(event: Pointer): boolean | void
	onPointerMove?(event: Pointer): boolean | void
	onPointerUp?(event: Pointer): boolean | void
	onKeyDown?(event: KeyboardEvent): boolean | void
}
