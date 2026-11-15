// ─────────────────────────────────────────────────────────────────────────────
// ml/index.js · Punto de entrada de nuestro aprendizaje automático (Super-Intelligence)
//
// Todo está escrito a mano en JavaScript, sin librerías ni API de pago, y se entrena en el navegador
// con datos de la NASA (FLEX, PSI-69: 257 gotas de combustible ardiendo en la ISS).
// Es determinista (semillas fijas): la misma pantalla da siempre los mismos números.
//
// El código está repartido en piezas pequeñas dentro de la carpeta ml/ — léelas en este orden:
//   1. ml/azar.js         Números aleatorios con semilla (para que todo salga siempre igual)
//   2. ml/utilidades.js   Estandarizar variables y resolver ecuaciones (lo usa la regresión lineal)
//   3. ml/arbol.js        Árbol de decisión (la pieza base del bosque aleatorio)
//   4. ml/boosting.js     XGBoost y CatBoost: muchos árboles pequeños que se corrigen unos a otros
//   5. ml/modelos.js      La lista de modelos (MODELS) y el ENSEMBLE que de verdad predice
//   6. ml/validacion.js   Cómo medimos si acierta: validación cruzada, R², aciertos, AUC
//
// Quien necesite el motor (model-block.js) importa desde aquí, así que lo de fuera no cambia.
// ─────────────────────────────────────────────────────────────────────────────
export { rng } from './random.js';
export { MODELS } from './models.js';
export { metrics, crossValidate } from './validation.js';
