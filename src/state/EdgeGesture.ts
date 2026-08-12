import type { EdgeHandle } from '../handles.ts'
import { moveEdgeHandle } from '../handles.ts'
import type { Panel } from '../panel.ts'
import { State } from './State.ts'
import type { Context, Pointer } from './State.ts'

/** The pointer is on a handle: hovering it, or dragging it. */
export class EdgeGesture extends State {
	handle: EdgeHandle | null = null
	/** The layout as it was when the drag began, so every move measures from one origin. */
	panelsAtStart: readonly Panel[] = []
	origin = 0

	constructor(context: Context) {
		super('edge', context)
		this.add(new EdgeHovering(context), new EdgeDragging(context))
	}

	protected cursorName(): string | null {
		if (!this.handle) return null
		return this.handle.axis === 'x' ? 'resize-x' : 'resize-y'
	}
}

class EdgeHovering extends State {
	constructor(context: Context) {
		super('hovering', context)
	}
}

class EdgeDragging extends State {
	constructor(context: Context) {
		super('dragging', context)
	}

	private get gesture(): EdgeGesture {
		return this.parent as EdgeGesture
	}

	onEnter(): void {
		this.gesture.panelsAtStart = this.context.getPanels()
	}

	/** A resize is live: the panels move under the pointer, so there is nothing to preview. */
	onPointerMove(event: Pointer): boolean {
		const { handle, panelsAtStart, origin } = this.gesture
		if (!handle) return true
		const along = handle.axis === 'x' ? event.at.x : event.at.y
		const minimum = handle.axis === 'x' ? this.context.getMinimum().x : this.context.getMinimum().y
		this.context.change(moveEdgeHandle(panelsAtStart, handle, handle.position + (along - origin), minimum))
		return true
	}

	onPointerUp(): boolean {
		this.gesture.parent?.transition('idle')
		return true
	}

	/** Escape puts the panels back, then lets the root take us home. */
	onKeyDown(event: KeyboardEvent): boolean | void {
		if (event.key !== 'Escape') return
		this.context.change([...this.gesture.panelsAtStart])
	}
}
