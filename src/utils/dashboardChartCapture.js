import html2canvas from 'html2canvas'

const CANVAS_MAX_EDGE = 16000
const HTML2CANVAS_TIMEOUT_MS = 120000

function expandirAncestrosParaCaptura(node) {
  let el = node?.parentElement
  while (el) {
    el.style.overflow = 'visible'
    el.style.maxHeight = 'none'
    el.style.height = 'auto'
    el = el.parentElement
  }
}

function rectLayoutEnContenedor(contenedor, bloque) {
  const cr = contenedor.getBoundingClientRect()
  const br = bloque.getBoundingClientRect()
  return {
    top: br.top - cr.top + contenedor.scrollTop,
    left: br.left - cr.left + contenedor.scrollLeft,
    width: br.width,
    height: br.height,
  }
}

function recortarDeCanvas(fuente, sx, sy, sw, sh) {
  const w = Math.max(1, Math.round(sw))
  const h = Math.max(1, Math.round(sh))
  const out = document.createElement('canvas')
  out.width = w
  out.height = h
  const ctx = out.getContext('2d')
  ctx.drawImage(fuente, Math.round(sx), Math.round(sy), w, h, 0, 0, w, h)
  return out
}

function conTimeout(promise, ms, mensaje) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error(mensaje)), ms)
    }),
  ])
}

/**
 * Una captura html2canvas del dashboard y recortes por `.dashboard-pdf-block`.
 */
export async function generarRecortesDashboard(el) {
  if (!el) {
    throw new Error('No hay contenido del dashboard para capturar.')
  }

  const bloques = [...el.querySelectorAll('.dashboard-pdf-block')]
  const rectsDom = bloques.map((b) => rectLayoutEnContenedor(el, b))

  const sh = el.scrollHeight
  const sw = el.scrollWidth
  let scale = 2
  while (scale > 0.5 && (sh * scale > CANVAS_MAX_EDGE || sw * scale > CANVAS_MAX_EDGE)) {
    scale -= 0.25
  }

  const canvasCompleto = await conTimeout(
    html2canvas(el, {
      scale,
      useCORS: true,
      logging: false,
      onclone: (clonedDoc) => {
        const cloned = clonedDoc.getElementById('dashboard-content')
        if (cloned) expandirAncestrosParaCaptura(cloned)
      },
    }),
    HTML2CANVAS_TIMEOUT_MS,
    'La captura del dashboard tardó demasiado. Prueba cerrar otros programas o reducir filtros.'
  )

  const sxScale = canvasCompleto.width / Math.max(1, sw)
  const syScale = canvasCompleto.height / Math.max(1, sh)

  return rectsDom.map((r) => {
    let sx = r.left * sxScale
    let sy = r.top * syScale
    let swPx = r.width * sxScale
    let shPx = r.height * syScale
    sx = Math.max(0, Math.min(sx, canvasCompleto.width - 1))
    sy = Math.max(0, Math.min(sy, canvasCompleto.height - 1))
    swPx = Math.min(swPx, canvasCompleto.width - sx)
    shPx = Math.min(shPx, canvasCompleto.height - sy)
    return recortarDeCanvas(canvasCompleto, sx, sy, swPx, shPx)
  })
}
