export interface Rect {
  x: number
  y: number
  w: number
  h: number
}

/** A portrait star chart: the sky at 4:5 in a frame, the title under it, a small footer at the bottom. */
export function posterLayout(w = 2400, h = 3300): { view: Rect; title: Rect; footer: Rect } {
  const m = Math.round(w / 15)
  const vw = w - m * 2
  const vh = Math.round(vw * 1.25)
  const view = { x: m, y: m, w: vw, h: vh }
  const footer = { x: m, y: h - m - 60, w: vw, h: 60 }
  const title = { x: m, y: view.y + vh + 40, w: vw, h: footer.y - 20 - (view.y + vh + 40) }
  return { view, title, footer }
}
