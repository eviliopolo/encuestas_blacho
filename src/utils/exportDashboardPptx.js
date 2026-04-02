/**
 * @param {HTMLCanvasElement[]} recortes
 * @param {string} fileName nombre del archivo .pptx
 */
export async function exportDashboardRecortesToPptx(recortes, fileName) {
  const pptxgen = (await import('pptxgenjs')).default
  const pres = new pptxgen()
  pres.layout = 'LAYOUT_16x9'
  pres.author = 'Encuestas orientación'

  const margin = 0.5
  const innerW = 10 - 2 * margin
  const innerH = 5.625 - 2 * margin

  const portada = pres.addSlide()
  portada.addText('Dashboard de estadísticas', {
    x: margin,
    y: 2,
    w: innerW,
    h: 1,
    fontSize: 28,
    bold: true,
    align: 'center',
  })
  portada.addText(new Date().toLocaleString('es-CO'), {
    x: margin,
    y: 3.2,
    w: innerW,
    h: 0.5,
    fontSize: 14,
    align: 'center',
    color: '666666',
  })

  for (const canvas of recortes) {
    if (canvas.width < 1 || canvas.height < 1) continue
    const slide = pres.addSlide()
    const data = canvas.toDataURL('image/png')
    let w = innerW
    let h = (canvas.height * w) / canvas.width
    if (h > innerH) {
      const s = innerH / h
      h = innerH
      w *= s
    }
    const x = margin + (innerW - w) / 2
    const y = margin + (innerH - h) / 2
    slide.addImage({ data, x, y, w, h })
  }

  await pres.writeFile({ fileName })
}
