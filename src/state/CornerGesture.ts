import { NONE, applyOutcome, getNewPanelId, getOutcome, getOutcomeRects } from '../corner.ts'
import type { Outcome, Point } from '../corner.ts'
import type { Panel, Rect } from '../panel.ts'
import { State } from './State.ts'
import type { Context, Pointer } from './State.ts'

/** The pointer is on a panel's corner: hovering it, or dragging it into a split or a join. */
export class CornerGesture extends State {
	panel: Panel | null = null
	origin: Point = { x: 0, y: 0 }
	outcome: Outcome = NONE

	constructor(context: Context) {
		super('corner', context)
		this.add(new CornerHovering(context), new CornerDragging(context))
	}

	protected cursorName(): string | null {
		return 'corner'
	}
}

class CornerHovering extends State {
	constructor(context: Context) {
		super('hovering', context)
	}
}

class CornerDragging extends State {
	constructor(context: Context) {
		super('dragging', context)
	}

	private get gesture(): CornerGesture {
		return this.parent as CornerGesture
	}

	onEnter(): void {
		this.gesture.outcome = NONE
	}

	/** Decide as we go: inward divides this panel, across onto a full-edge neighbour swallows it. */
	onPointerMove(event: Pointer): boolean {
		const { panel, origin } = this.gesture
		if (!panel) return true
		this.gesture.outcome = getOutcome(panel, this.context.getPanels(), this.context.getMinimum(), origin, event.at)
		this.context.update()
		return true
	}

	/** Releasing writes whatever the drag had decided. */
	onPointerUp(): boolean {
		const { panel, outcome } = this.gesture
		const panels = this.context.getPanels()
		if (panel && outcome.kind !== 'none') {
			this.context.change(applyOutcome(panels, panel, outcome, getNewPanelId(panels)))
		}
		this.gesture.parent?.transition('idle')
		return true
	}

	protected previewRects(): Rect[] {
		const { panel, outcome } = this.gesture
		return panel ? getOutcomeRects(panel, this.context.getPanels(), outcome) : []
	}

	protected cursorName(): string | null {
		const { outcome } = this.gesture
		if (outcome.kind === 'join') return `join-${outcome.towards}`
		// A split is a seam being placed, so it wears the same cursor as moving one.
		if (outcome.kind === 'split') return outcome.direction === 'row' ? 'resize-x' : 'resize-y'
		return 'blocked'
	}
}
