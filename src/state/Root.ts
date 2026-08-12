import type { EdgeHandle } from '../handles.ts'
import type { Panel, Rect } from '../panel.ts'
import { CornerGesture } from './CornerGesture.ts'
import { EdgeGesture } from './EdgeGesture.ts'
import { Idle } from './Idle.ts'
import { State } from './State.ts'
import type { Context, Point, Pointer } from './State.ts'

/**
 * The top of the tree. It routes what the pointer touched into the gesture that owns it, and it
 * catches what no gesture handled — Escape, from anywhere, always comes home to idle.
 */
export class Root extends State {
	/** The handle or corner the pointer is on, so it can mark itself. */
	target: string | null = null

	constructor(context: Context) {
		super('root', context)
		this.add(new Idle(context), new EdgeGesture(context), new CornerGesture(context))
	}

	onKeyDown(event: KeyboardEvent): boolean | void {
		if (event.key !== 'Escape') return
		this.target = null
		this.transition('idle')
		return true
	}

	hoverEdge(handle: EdgeHandle, target: string): void {
		if (this.isBusy) return
		this.target = target
		const gesture = this.children.edge as EdgeGesture
		gesture.handle = handle
		this.transition('edge')
		gesture.transition('hovering')
	}

	hoverCorner(panel: Panel, target: string): void {
		if (this.isBusy) return
		this.target = target
		const gesture = this.children.corner as CornerGesture
		gesture.panel = panel
		this.transition('corner')
		gesture.transition('hovering')
	}

	unhover(): void {
		if (this.isBusy) return
		this.target = null
		this.transition('idle')
	}

	grabEdge(handle: EdgeHandle, target: string, at: Point): void {
		this.target = target
		const gesture = this.children.edge as EdgeGesture
		gesture.handle = handle
		gesture.origin = handle.axis === 'x' ? at.x : at.y
		this.transition('edge')
		gesture.transition('dragging')
	}

	grabCorner(panel: Panel, target: string, at: Point): void {
		this.target = target
		const gesture = this.children.corner as CornerGesture
		gesture.panel = panel
		gesture.origin = at
		this.transition('corner')
		gesture.transition('dragging')
	}

	/** Which phase the active gesture is in, or null when idle. */
	private get phase(): string | null {
		return this.current?.current?.id ?? null
	}

	/** A drag owns the pointer: hovering elsewhere means nothing until it ends. */
	get isBusy(): boolean {
		return this.phase === 'dragging'
	}

	/**
	 * Whether a corner should mark itself: while the pointer rests on it, and on into a drag until
	 * a preview appears. Once there is something to see, the preview does the talking.
	 */
	isMarked(target: string): boolean {
		if (this.target !== target) return false
		if (this.phase === 'hovering') return true
		return this.phase === 'dragging' && this.getPreview().length === 0
	}

	pointerMove(event: Pointer): void {
		this.dispatch('onPointerMove', event as never)
	}

	pointerUp(event: Pointer): void {
		this.dispatch('onPointerUp', event as never)
	}

	keyDown(event: KeyboardEvent): void {
		this.dispatch('onKeyDown', event as never)
	}

	previews(): Rect[] {
		return this.getPreview()
	}
}
