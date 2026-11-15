// ─────────────────────────────────────────────────────────────────────────────
// fire-twin/index.js - Fire Twin: gemelo digital del fuego en una nave (motor + interfaz, es/en)
//
// REGLA: cada número sale de datos de la NASA (PSI o NTRS) o se marca como supuesto nuestro.
// Calibración: data/sim/calibracion.json (BASS-II, FLEX, Saffire, BRE). Los ajustes se comprueban
// dejando un ensayo fuera ("leave-one-out").
//
// El código está repartido en la carpeta firetwin/, leer en este orden:
//   1. firetwin/fuentes.js   Las fuentes que citamos (PSI y NTRS), con su enlace
//   2. firetwin/datos.js     Los datos medidos por la NASA, los materiales y los escenarios (nave + fase)
//   3. firetwin/motor.js     El cálculo: simulate(escenario) → ¿arde?, ¿cuánto tiempo hay?, ¿qué pasa con plan?
//   4. firetwin/textos.js    Los textos de la interfaz en español e inglés
//   5. firetwin/interfaz.js  La pantalla: formulario, escena animada y tarjetas (tiene una guía al principio)
//        · firetwin/control-tierra.js   El dibujo del control en tierra y su pantalla grande
//        · firetwin/tutorial.js         Los pasos del tutorial guiado
//        · firetwin/super-intelligence.js  La tarjeta «Dónde está la Super-Intelligence»
//
// Este archivo solo reexporta lo que usan los demás (panel, respuestas, versiones de Fer e Iván…),
// así que quien lo importaba sigue funcionando igual.
// ─────────────────────────────────────────────────────────────────────────────
export { ML, pBurn, FLEX_FIT, kHept, CO_LOAD, SPREAD, SMAC_CO, MAT, PRESETS } from './data.js';
export { simulate } from './engine.js';
export { mountFireTwin } from './ui.js';
