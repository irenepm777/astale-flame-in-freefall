// ─────────────────────────────────────────────────────────────────────────────
// tutorial.js - Pasos del tutorial guiado del Fire Twin
//
// El tutorial (tour.js) resalta partes de la pantalla una a una con un texto.
// Aquí solo se define QUÉ se resalta y QUÉ se dice en cada paso (es/en).
// Si se cambia la interfaz del Fire Twin, hay que comprobar que los selectores
// de abajo siguen existiendo (.ft-controls, .fs-bar, .ft-scene, …).
// ─────────────────────────────────────────────────────────────────────────────

export function pasosTutorial(root, EN) {
  // q(selector) → función que busca ese elemento cuando el tutorial lo necesita
  const q = (sel) => () => root.querySelector(sel);
return [
  { el: q('.ft-controls'), title: EN ? '1 · Set up the scenario' : '1 · Define el escenario',
    text: EN ? 'Choose the <b>vehicle and mission phase</b>, <b>what catches fire</b> and how big. If you want, fine-tune oxygen, pressure and ventilation. Everything recalculates instantly.'
      : 'Elige la <b>nave y la fase</b> de la misión, <b>qué empieza a arder</b> y de qué tamaño. Si quieres, ajusta el oxígeno, la presión y la ventilación. Todo se recalcula al momento.' },
  { el: () => root.querySelector('.fs-bar'), title: EN ? '2 · Press Play' : '2 · Pulsa Reproducir',
    text: EN ? 'Watch the fire grow minute by minute. Drag the bar to jump to any moment, and compare <b>Doing nothing</b> with <b>With the plan</b>.'
      : 'Verás crecer el fuego minuto a minuto. Arrastra la barra para ir a cualquier momento y compara <b>Sin hacer nada</b> con <b>Con el plan</b>.' },
  { el: q('.ft-scene'), title: EN ? '3 · Watch the spacecraft' : '3 · Mira la nave',
    text: EN ? 'The flame looks as it really does in that gravity. Top left: time, CO in the air and the fire status. The speech bubbles say what each crew member does at that moment.'
      : 'La llama tiene el aspecto real de esa gravedad. Arriba a la izquierda: el tiempo, el CO del aire y el estado del fuego. Los bocadillos dicen qué hace cada tripulante en ese momento.' },
  { el: q('.ft-crew'), title: EN ? '4 · Ground control' : '4 · Control en tierra',
    text: EN ? 'What mission control says at each moment. Waves come out of the antenna when there is a new order.' : 'Lo que dice el control en tierra en cada momento. Cuando hay una orden nueva, salen ondas de la antena.' },
  { el: q('#ft-q3'), title: EN ? '5 · The action card' : '5 · La tarjeta de acción',
    text: EN ? 'Who does what in each phase (before, alarm, act, confirm, after), with the NASA source of every order. The current moment lights up, and it can be printed.'
      : 'Quién hace qué en cada fase (antes, aviso, actuar, confirmar, después), con la fuente de la NASA de cada orden. Se ilumina el momento actual y se puede imprimir.' },
  { el: q('.ft-story'), title: EN ? 'Prefer to see it told?' : '¿Prefieres verlo contado?',
    text: EN ? 'Press <b>Watch the story</b>: a complete case on Orion before a spacewalk, with captions. You can replay this tutorial with <b>❓ Tutorial</b>.'
      : 'Pulsa <b>Ver la historia</b>: un caso completo en Orion antes de un paseo espacial, con subtítulos. Este tutorial se repite con <b>❓ Tutorial</b>.' },
];
}
