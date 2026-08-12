import { State } from './State.ts'
import type { Context } from './State.ts'

/** Nothing is happening. Every gesture returns here when it ends or is cancelled. */
export class Idle extends State {
	constructor(context: Context) {
		super('idle', context)
	}
}
