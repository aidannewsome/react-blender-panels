/** A rectangle in fractions of the container (0–1). What a gesture produces before it has an id. */
export interface Rect {
	x: number
	y: number
	w: number
	h: number
}

/** One panel: a rectangle with an identity. */
export interface Panel extends Rect {
	id: string
}
