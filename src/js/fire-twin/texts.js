// ─────────────────────────────────────────────────────────────────────────────
// texts.js - Textos de la interfaz del Fire Twin, en español (es) y en inglés (en)
//
// Todos los rótulos fijos (etiquetas del formulario, títulos de las tarjetas, veredictos…).
// La interfaz elige el idioma con T[LANG]. Para cambiar un texto, hay que cambiarlo en los dos idiomas.
// ─────────────────────────────────────────────────────────────────────────────

export const T = {
  es: {
    scenario: 'Escenario', preset: 'Nave y fase', material: 'Qué empieza a arder', size: 'Tamaño del fuego', o2: 'Oxígeno', p: 'Presión', u: 'Ventilación',
    V: 'Volumen libre de la cabina', g: 'Gravedad', delay: 'Tiempo de reacción de la tripulación', sens: 'Sensor de gases sensible (láser CPM)',
    gNames: { 0: '0 g (órbita)', 0.16: '0,16 g (Luna)', 0.38: '0,38 g (Marte)', 1: '1 g / aceleración' },
    q1: '1 · ¿Arde aquí?', q2: '2 · ¿Cuánto tiempo hay?', q3: '3 · ¿Qué hacer?', q4: 'El mismo fuego en otras naves', q5: 'De dónde sale cada número', q6: 'Comprobación del modelo',
    burns: 'ARDE', edge: 'EN EL LÍMITE', safe: 'NO DEBERÍA ARDER', untested: 'SIN ENSAYOS',
    extrap: 'extrapolado', tested: 'dentro de lo ensayado',
    noFire: 'Con este material y este oxígeno no hay incendio que simular. Prueba a subir el O₂ o a cambiar de material.',
    ifBurns: 'Si llegara a arder:',
    tl: { ign: 'Ignición', smoke: 'Detector de humo', gas: 'Sensor de CO', act: 'Actúa la tripulación', out: 'Fuego apagado', smac: 'CO > 425 ppm' },
    none: 'Sin hacer nada', plan: 'Con el plan recomendado', never: 'nunca', min: 'min', s: 's', worstOnly: '(solo en el peor caso)', burnsOut: 'se consume en',
    t425: 'CO al límite de 1 h (425 ppm)', peak: 'CO máximo', detect: 'Primer aviso', outAt: 'Fuego apagado',
    noDetect: 'Nadie se entera: ningún detector salta en 30 min', smokeNever: 'nunca (sin ventilación el humo no llega)',
    vehicle: 'Nave', verdict: 'Veredicto', tags: { psi: 'medido (PSI)', nasa: 'literatura NASA', sup: 'supuesto nuestro' },
    share: (a, b) => `${a} de ${b} números salen de la NASA`,
    chartY: 'CO en la cabina (ppm)', chartX: 'minutos desde la ignición',
    bassChart: 'Tu O₂ frente a los 41 apagados medidos en BASS-II (cada punto: O₂ al que se apagó una llama)',
    slab: 'placas', rod: 'varillas', you: 'tu O₂',
  },
  en: {
    scenario: 'Scenario', preset: 'Vehicle and phase', material: 'What catches fire', size: 'Fire size', o2: 'Oxygen', p: 'Pressure', u: 'Ventilation',
    V: 'Free cabin volume', g: 'Gravity', delay: 'Crew reaction time', sens: 'Sensitive gas sensor (CPM laser)',
    gNames: { 0: '0 g (orbit)', 0.16: '0.16 g (Moon)', 0.38: '0.38 g (Mars)', 1: '1 g / acceleration' },
    q1: '1 · Does it burn here?', q2: '2 · How much time is there?', q3: '3 · What to do?', q4: 'The same fire in other vehicles', q5: 'Where every number comes from', q6: 'Model check',
    burns: 'BURNS', edge: 'BORDERLINE', safe: 'SHOULD NOT BURN', untested: 'UNTESTED',
    extrap: 'extrapolated', tested: 'within tested conditions',
    noFire: 'With this material and this oxygen there is no fire to simulate. Try raising the O₂ or changing the material.',
    ifBurns: 'If it did catch fire:',
    tl: { ign: 'Ignition', smoke: 'Smoke detector', gas: 'CO sensor', act: 'Crew acts', out: 'Fire out', smac: 'CO > 425 ppm' },
    none: 'Doing nothing', plan: 'With the recommended plan', never: 'never', min: 'min', s: 's', worstOnly: '(worst case only)', burnsOut: 'burns out in',
    t425: 'CO at the 1-hour limit (425 ppm)', peak: 'Peak CO', detect: 'First warning', outAt: 'Fire out',
    noDetect: 'Nobody notices: no detector goes off within 30 min', smokeNever: 'never (without ventilation the smoke does not reach it)',
    vehicle: 'Vehicle', verdict: 'Verdict', tags: { psi: 'measured (PSI)', nasa: 'NASA literature', sup: 'our assumption' },
    share: (a, b) => `${a} of ${b} numbers come from NASA`,
    chartY: 'CO in the cabin (ppm)', chartX: 'minutes since ignition',
    bassChart: 'Your O₂ against the 41 extinctions measured in BASS-II (each dot: the O₂ at which a flame went out)',
    slab: 'plates', rod: 'rods', you: 'your O₂',
  },
};
