import { useState, useEffect, useRef } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { SI_NO_OPTIONS, CHECKBOX_OPTIONS } from '@/lib/constants'
import { cn } from '@/lib/utils'
import { AlertCircle } from 'lucide-react'

const getDefaultForm = () => {
  const today = new Date().toISOString().split('T')[0]
  return {
    fecha_registro: today,
    nombre: '',
    ied: '',
    curso: '',
    identificacion: '',
    edad: '',
    p1_continuar_formacion: '',
    p2_info_edsuperior_colegio: '',
    p3_orientacion_edsuperior_casa: '',
    p4_orientacion_postbachillerato: '',
    p5_conoce_programas_academicos: '',
    p6_tipo_carrera: '',
    p7_area_mayor_destreza: '',
    p8_areas_formacion: '',
    p9_importante_continuar_estudios: '',
    p10_despues_bachillerato: '',
    p11_herramientas_vocacion: '',
    p12_confianza_capacidades: '',
    p13_motivacion_familia: '',
    p14_apoyo_padres_orientacion: '',
    p15_apoyo_familia_carrera: '',
    p16_motivado_futuro: '',
    p17_padre_nivel_educativo: '',
    p17_madre_nivel_educativo: '',
    p18_expresion_familiar: '',
    p19a_conoce_autoconocimiento: '',
    p19b_conoce_educacion_superior: '',
    p19c_conoce_mundo_laboral: '',
    p20_conceptos_ayuda_formacion: '',
    p21_estudiar_fuera_barranquilla: '',
    p22_ejemplo_inspiracion: '',
    p23_factor_economico_importante: '',
    p24_redes_sociales_influyen: '',
    p25_frase1_expectativas_familia: '',
    p25_frase2_carreras_no_adecuadas: '',
    p25_frase3_profesiones_sin_futuro: '',
    p25_frase4_dificil_acceder_carreras: '',
    p25_frase5_no_creencia_influye: '',
    p26_obstaculo_principal: '',
    p27_institucion_identificada: '',
    p28_info_becas_programas: '',
    p29_abandono_colegio: '',
    p30_conoce_opciones_laborales: '',
    p31_conoce_tipos_contrato: '',
    p32_conoce_entrevista_trabajo: '',
    p33_sabe_hoja_vida: '',
  }
}

// Convierte valor guardado "A,B" en array para checkboxes
function csvToArray(str) {
  if (!str || typeof str !== 'string') return []
  return str
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

// Convierte array seleccionado en string "A,B"
function arrayToCsv(arr) {
  if (!Array.isArray(arr) || arr.length === 0) return ''
  return arr.filter(Boolean).join(',')
}

function FormSection({ title, children, className }) {
  return (
    <Card>
      <CardHeader className="py-3 px-4 border-b bg-muted/40">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      </CardHeader>
      <CardContent className="pt-4 px-4 pb-4 space-y-4">
        {children}
      </CardContent>
    </Card>
  )
}

function FieldError({ message }) {
  if (!message) return null
  return (
    <p className="text-xs text-error mt-1 flex items-center gap-1" role="alert">
      <AlertCircle className="h-3.5 w-3.5 shrink-0" />
      {message}
    </p>
  )
}

function YesNoField({ label, value, onChange, required, error }) {
  return (
    <div className="space-y-1">
      <Label className={cn(error && 'text-error')}>
        {label}
        {required && <span className="text-error ml-0.5">*</span>}
      </Label>
      <Select value={value || ''} onValueChange={onChange}>
        <SelectTrigger className={cn(error && 'border-error focus-visible:ring-error')}>
          <SelectValue placeholder="Seleccione..." />
        </SelectTrigger>
        <SelectContent>
          {SI_NO_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <FieldError message={error} />
    </div>
  )
}

function CheckboxGroup({ label, options, selectedValues, onChange, required, error }) {
  const selected = Array.isArray(selectedValues) ? selectedValues : csvToArray(selectedValues || '')
  const toggle = (opt) => {
    const next = selected.includes(opt)
      ? selected.filter((o) => o !== opt)
      : [...selected, opt]
    onChange(arrayToCsv(next))
  }
  return (
    <div className="space-y-1">
      <Label className={cn(error && 'text-error')}>
        {label}
        {required && <span className="text-error ml-0.5">*</span>}
      </Label>
      <div className="flex flex-wrap gap-4">
        {options.map((opt) => (
          <label key={opt} className="flex items-center gap-2 cursor-pointer">
            <Checkbox
              checked={selected.includes(opt)}
              onChange={() => toggle(opt)}
            />
            <span className="text-sm">{opt}</span>
          </label>
        ))}
      </div>
      <FieldError message={error} />
    </div>
  )
}

function validateForm(form) {
  const err = {}
  if (!form.nombre?.trim()) err.nombre = 'El nombre es obligatorio.'
  if (!form.fecha_registro?.trim()) err.fecha_registro = 'La fecha de registro es obligatoria.'
  const edadNum = form.edad !== '' && form.edad != null ? parseInt(form.edad, 10) : null
  if (edadNum != null && (isNaN(edadNum) || edadNum < 12 || edadNum > 25)) {
    err.edad = 'La edad debe estar entre 12 y 25.'
  }
  return err
}

export function EncuestaForm({ open, onOpenChange, initialData, onSave, saving }) {
  const [form, setForm] = useState(getDefaultForm)
  const [errors, setErrors] = useState({})
  const firstErrorRef = useRef(null)
  const isEdit = !!initialData?.id

  useEffect(() => {
    if (open) {
      setErrors({})
      if (initialData) {
        const next = { ...getDefaultForm() }
        Object.keys(next).forEach((key) => {
          if (initialData[key] !== undefined && initialData[key] !== null) {
            next[key] = initialData[key]
          }
        })
        setForm(next)
      } else {
        setForm(getDefaultForm())
      }
    }
  }, [open, initialData])

  const update = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }))
    if (errors[key]) setErrors((prev) => { const next = { ...prev }; delete next[key]; return next; })
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const err = validateForm(form)
    if (Object.keys(err).length > 0) {
      setErrors(err)
      setTimeout(() => firstErrorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 100)
      return
    }
    setErrors({})
    const payload = { ...form }
    if (form.edad !== '') payload.edad = parseInt(form.edad, 10) || null
    if (form.fecha_registro) payload.fecha_registro = form.fecha_registro
    onSave(payload)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-3xl max-h-[90vh] overflow-y-auto"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar encuesta' : 'Nueva encuesta'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          {Object.keys(errors).length > 0 && (
            <Alert variant="destructive" ref={firstErrorRef} className="mb-2 scroll-mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Revise los siguientes campos:</strong>
                <ul className="list-disc list-inside mt-1 text-sm">
                  {Object.entries(errors).map(([key, msg]) => (
                    <li key={key}>{msg}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}
          <FormSection title="Datos Básicos">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className={cn(errors.fecha_registro && 'text-error')}>
                  Fecha de registro <span className="text-error">*</span>
                </Label>
                <Input
                  type="date"
                  value={form.fecha_registro || ''}
                  onChange={(e) => update('fecha_registro', e.target.value)}
                  className={cn(errors.fecha_registro && 'border-error focus-visible:ring-error')}
                />
                <FieldError message={errors.fecha_registro} />
              </div>
              <div className="space-y-1">
                <Label className={cn(errors.nombre && 'text-error')}>
                  Nombre <span className="text-error">*</span>
                </Label>
                <Input
                  value={form.nombre || ''}
                  onChange={(e) => update('nombre', e.target.value)}
                  placeholder="Nombre completo"
                  className={cn(errors.nombre && 'border-error focus-visible:ring-error')}
                />
                <FieldError message={errors.nombre} />
              </div>
              <div className="space-y-1">
                <Label>IED</Label>
                <Input
                  value={form.ied || ''}
                  onChange={(e) => update('ied', e.target.value)}
                  placeholder="Institución educativa"
                />
              </div>
              <div className="space-y-1">
                <Label>Curso</Label>
                <Input
                  value={form.curso || ''}
                  onChange={(e) => update('curso', e.target.value)}
                  placeholder="Ej. 11"
                />
              </div>
              <div className="space-y-1">
                <Label>Identificación</Label>
                <Input
                  value={form.identificacion || ''}
                  onChange={(e) => update('identificacion', e.target.value.replace(/\D/g, ''))}
                  placeholder="Solo números"
                />
              </div>
              <div className="space-y-1">
                <Label className={cn(errors.edad && 'text-error')}>Edad</Label>
                <Input
                  type="number"
                  min={12}
                  max={25}
                  value={form.edad || ''}
                  onChange={(e) => update('edad', e.target.value)}
                  placeholder="12-25"
                  className={cn(errors.edad && 'border-error focus-visible:ring-error')}
                />
                <FieldError message={errors.edad} />
              </div>
            </div>
          </FormSection>

          <FormSection title="Formación y Estudios (P1-P9)">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <YesNoField
                label="P1 - ¿Continuarías tu formación después del bachillerato?"
                value={form.p1_continuar_formacion}
                onChange={(v) => update('p1_continuar_formacion', v)}
              />
              <YesNoField
                label="P2 - ¿En el colegio te dan información sobre educación superior?"
                value={form.p2_info_edsuperior_colegio}
                onChange={(v) => update('p2_info_edsuperior_colegio', v)}
              />
              <YesNoField
                label="P3 - ¿En tu casa te orientan sobre educación superior?"
                value={form.p3_orientacion_edsuperior_casa}
                onChange={(v) => update('p3_orientacion_edsuperior_casa', v)}
              />
              <YesNoField
                label="P4 - ¿Te han orientado sobre qué hacer después del bachillerato?"
                value={form.p4_orientacion_postbachillerato}
                onChange={(v) => update('p4_orientacion_postbachillerato', v)}
              />
              <YesNoField
                label="P5 - ¿Conoces los programas académicos que ofrecen las IES?"
                value={form.p5_conoce_programas_academicos}
                onChange={(v) => update('p5_conoce_programas_academicos', v)}
              />
            </div>
            <CheckboxGroup
              label="P6 - ¿Te gustaría estudiar una carrera?"
              options={CHECKBOX_OPTIONS.p6_tipo_carrera}
              selectedValues={form.p6_tipo_carrera}
              onChange={(v) => update('p6_tipo_carrera', v)}
            />
            <CheckboxGroup
              label="P7 - ¿En qué área de conocimiento te identificas más o crees tener mayores destrezas?"
              options={CHECKBOX_OPTIONS.p7_area_mayor_destreza}
              selectedValues={form.p7_area_mayor_destreza}
              onChange={(v) => update('p7_area_mayor_destreza', v)}
            />
            <CheckboxGroup
              label="P8 - ¿De las siguientes áreas de estudio, cuáles te gustaría seguir tu formación académica?"
              options={CHECKBOX_OPTIONS.p8_areas_formacion}
              selectedValues={form.p8_areas_formacion}
              onChange={(v) => update('p8_areas_formacion', v)}
            />
            <YesNoField
              label="P9 - ¿Consideras importante continuar estudiando después del bachillerato?"
              value={form.p9_importante_continuar_estudios}
              onChange={(v) => update('p9_importante_continuar_estudios', v)}
            />
          </FormSection>

          <FormSection title="Áreas de Interés (P10-P18)">
            <CheckboxGroup
              label="P10 - Cuando termine el bachillerato, pienso:"
              options={CHECKBOX_OPTIONS.p10_despues_bachillerato}
              selectedValues={form.p10_despues_bachillerato}
              onChange={(v) => update('p10_despues_bachillerato', v)}
            />
            <CheckboxGroup
              label="P11 - ¿En el colegio te brindan herramientas que te ayuden a identificar tu vocación?"
              options={CHECKBOX_OPTIONS.p11_herramientas_vocacion}
              selectedValues={form.p11_herramientas_vocacion}
              onChange={(v) => update('p11_herramientas_vocacion', v)}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <YesNoField
                label="P12 - ¿Tienes confianza en tus capacidades?"
                value={form.p12_confianza_capacidades}
                onChange={(v) => update('p12_confianza_capacidades', v)}
              />
              <YesNoField
                label="P13 - ¿Tu familia te motiva?"
                value={form.p13_motivacion_familia}
                onChange={(v) => update('p13_motivacion_familia', v)}
              />
            </div>
            <CheckboxGroup
              label="P14 - ¿Tus padres o familiares te ayudan y motivan en tu orientación vocacional?"
              options={CHECKBOX_OPTIONS.p14_apoyo_padres_orientacion}
              selectedValues={form.p14_apoyo_padres_orientacion}
              onChange={(v) => update('p14_apoyo_padres_orientacion', v)}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <YesNoField
                label="P15 - ¿Tu familia apoya la carrera que quieres estudiar?"
                value={form.p15_apoyo_familia_carrera}
                onChange={(v) => update('p15_apoyo_familia_carrera', v)}
              />
              <YesNoField
                label="P16 - ¿Te sientes motivado por tu futuro?"
                value={form.p16_motivado_futuro}
                onChange={(v) => update('p16_motivado_futuro', v)}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <CheckboxGroup
                label="P17 - Nivel educativo del padre"
                options={CHECKBOX_OPTIONS.p17_padre_nivel_educativo}
                selectedValues={form.p17_padre_nivel_educativo}
                onChange={(v) => update('p17_padre_nivel_educativo', v)}
              />
              <CheckboxGroup
                label="P17 - Nivel educativo de la madre"
                options={CHECKBOX_OPTIONS.p17_madre_nivel_educativo}
                selectedValues={form.p17_madre_nivel_educativo}
                onChange={(v) => update('p17_madre_nivel_educativo', v)}
              />
            </div>
            <CheckboxGroup
              label="P18 - ¿En tu familia puedes expresar lo que sientes y piensas?"
              options={CHECKBOX_OPTIONS.p18_expresion_familiar}
              selectedValues={form.p18_expresion_familiar}
              onChange={(v) => update('p18_expresion_familiar', v)}
            />
          </FormSection>

          <FormSection title="Orientación Familiar (P19-P26)">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <YesNoField
                label="P19a - ¿Conoces el concepto de autoconocimiento?"
                value={form.p19a_conoce_autoconocimiento}
                onChange={(v) => update('p19a_conoce_autoconocimiento', v)}
              />
              <YesNoField
                label="P19b - ¿Conoces la oferta de educación superior?"
                value={form.p19b_conoce_educacion_superior}
                onChange={(v) => update('p19b_conoce_educacion_superior', v)}
              />
              <YesNoField
                label="P19c - ¿Conoces el mundo laboral?"
                value={form.p19c_conoce_mundo_laboral}
                onChange={(v) => update('p19c_conoce_mundo_laboral', v)}
              />
            </div>
            <CheckboxGroup
              label="P20 - ¿Cuáles de estos conceptos te sirven de ayuda para tu proceso de formación?"
              options={CHECKBOX_OPTIONS.p20_conceptos_ayuda_formacion}
              selectedValues={form.p20_conceptos_ayuda_formacion}
              onChange={(v) => update('p20_conceptos_ayuda_formacion', v)}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <YesNoField
                label="P21 - ¿Estarías dispuesto a estudiar fuera de Barranquilla?"
                value={form.p21_estudiar_fuera_barranquilla}
                onChange={(v) => update('p21_estudiar_fuera_barranquilla', v)}
              />
              <YesNoField
                label="P22 - ¿Tienes un ejemplo o persona que te inspire?"
                value={form.p22_ejemplo_inspiracion}
                onChange={(v) => update('p22_ejemplo_inspiracion', v)}
              />
              <YesNoField
                label="P23 - ¿El factor económico es importante para tu decisión?"
                value={form.p23_factor_economico_importante}
                onChange={(v) => update('p23_factor_economico_importante', v)}
              />
              <YesNoField
                label="P24 - ¿Las redes sociales influyen en tu decisión?"
                value={form.p24_redes_sociales_influyen}
                onChange={(v) => update('p24_redes_sociales_influyen', v)}
              />
            </div>
            <div className="space-y-3">
              <Label>P25 - Frases (Sí/No)</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <YesNoField
                  label="Frase 1 - Expectativas de la familia"
                  value={form.p25_frase1_expectativas_familia}
                  onChange={(v) => update('p25_frase1_expectativas_familia', v)}
                />
                <YesNoField
                  label="Frase 2 - Carreras no adecuadas"
                  value={form.p25_frase2_carreras_no_adecuadas}
                  onChange={(v) => update('p25_frase2_carreras_no_adecuadas', v)}
                />
                <YesNoField
                  label="Frase 3 - Profesiones sin futuro"
                  value={form.p25_frase3_profesiones_sin_futuro}
                  onChange={(v) => update('p25_frase3_profesiones_sin_futuro', v)}
                />
                <YesNoField
                  label="Frase 4 - Difícil acceder a carreras"
                  value={form.p25_frase4_dificil_acceder_carreras}
                  onChange={(v) => update('p25_frase4_dificil_acceder_carreras', v)}
                />
                <YesNoField
                  label="Frase 5 - La no creencia influye"
                  value={form.p25_frase5_no_creencia_influye}
                  onChange={(v) => update('p25_frase5_no_creencia_influye', v)}
                />
              </div>
            </div>
            <CheckboxGroup
              label="P26 - ¿Cuál de los siguientes factores crees que puede ser tu obstáculo para cumplir tus metas?"
              options={CHECKBOX_OPTIONS.p26_obstaculo_principal}
              selectedValues={form.p26_obstaculo_principal}
              onChange={(v) => update('p26_obstaculo_principal', v)}
            />
          </FormSection>

          <FormSection title="Información Institucional (P27-P33)">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <YesNoField
                label="P27 - ¿Tienes alguna institución de educación superior identificada?"
                value={form.p27_institucion_identificada}
                onChange={(v) => update('p27_institucion_identificada', v)}
              />
              <YesNoField
                label="P28 - ¿Tienes información sobre becas y programas?"
                value={form.p28_info_becas_programas}
                onChange={(v) => update('p28_info_becas_programas', v)}
              />
              <YesNoField
                label="P29 - ¿Has pensado en abandonar el colegio?"
                value={form.p29_abandono_colegio}
                onChange={(v) => update('p29_abandono_colegio', v)}
              />
              <YesNoField
                label="P30 - ¿Conoces las opciones laborales según tu perfil?"
                value={form.p30_conoce_opciones_laborales}
                onChange={(v) => update('p30_conoce_opciones_laborales', v)}
              />
              <YesNoField
                label="P31 - ¿Conoces los tipos de contrato laboral?"
                value={form.p31_conoce_tipos_contrato}
                onChange={(v) => update('p31_conoce_tipos_contrato', v)}
              />
              <YesNoField
                label="P32 - ¿Sabes cómo enfrentar una entrevista de trabajo?"
                value={form.p32_conoce_entrevista_trabajo}
                onChange={(v) => update('p32_conoce_entrevista_trabajo', v)}
              />
              <YesNoField
                label="P33 - ¿Sabes cómo elaborar una hoja de vida?"
                value={form.p33_sabe_hoja_vida}
                onChange={(v) => update('p33_sabe_hoja_vida', v)}
              />
            </div>
          </FormSection>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Guardando...' : isEdit ? 'Actualizar' : 'Guardar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
