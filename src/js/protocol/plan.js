// ─────────────────────────────────────────────────────────────────────────────
// plan.js - The response plan: who does what, in which order, and why
//
// buildPlan({ hab, zone, mat, room }) runs the Fire Twin engine (simulate) for the chosen scenario and turns the result
// into a list of actions. Each action is one order in plain language, written as
//   <b>Imperative sentence.</b> + why(): one sentence with the physical reason and a number calculated for THIS scenario
// and it lists the NASA source it is based on (sources.js). Measured values come from PSI; estimates are called estimates.
//
// The science behind the orders:
//   · CO₂ extinguisher like the ISS one (PFE: 2.7 kg of CO₂ = 61 mol ≈ 1.49 m³ of gas at 1 atm and 22 °C). In a volume V
//     the partial pressure of CO₂ is 1.486 / V atm whatever the cabin pressure, and oxygen is diluted in the same proportion.
//     On the ISS the gas first stays in one module, so V ≈ station volume / number of modules.
//   · Oxygen limit of acrylic measured in BASS-II (vd.lo / vd.hi from the engine).
//   · Flame spread on fabric (r.v, mm/s) from Saffire-II, corrected with FLEX for this oxygen and pressure.
//   · Rising current with partial gravity: 50 · √g cm/s (assumption of the twin, ASSUME.plume1g).
//   · CO reaching 425 ppm (NASA 1-hour limit) and detector alarm time come from the Saffire VI calibration (r.t425, r.tDet).
//
// "Everything in the zone" (mat = 'mix'): the plan is calculated with the material that makes the air dangerous soonest,
// with a large fire (41 × 100 cm), and it gathers the advice for every material in the zone.
// The plan always ends with: check with your own eyes that the fire is out, then inspect and report to mission control.
// ─────────────────────────────────────────────────────────────────────────────
import { simulate, PRESETS, MAT } from '../fire-twin/index.js';
import { t, LANG, inLang } from './i18n.js';
import { nf, duration } from './format.js';
import { S } from './sources.js';
import { HABITATS, ZONES, MATERIALS, ALL_MATERIALS, geometry, roomName } from './scenarios.js';
import { CREW } from './crew.js';

const why = (text) => `<span class="f-why"> ${text}</span>`;

/** Volume (m³) the extinguisher gas spreads into: one module on the ISS, the whole cabin elsewhere. */
export const localVolume = (H, s, G) => (H.kind === 'chain' ? s.V / G.rooms.length : s.V);

export function buildPlan(cfg) {
  const H = HABITATS[cfg.hab], P = PRESETS[cfg.hab], G = geometry(cfg.hab);
  const mix = cfg.mat === 'mix', mats = mix ? ZONES[cfg.zone]?.mats || ALL_MATERIALS : [cfg.mat];
  const base = { ...P, preset: cfg.hab, size: mix ? 'large' : 'saffire', delay: 30, cpm: true };
  // the most dangerous material here: one that burns, and the one that drives CO to the limit first
  const danger = (k) => { const x = simulate({ ...base, mat: k }); return (x.vd.st === 'safe' ? 1e9 : 0) + (x.t425.none[0] ?? 1e6); };
  const mat = mix ? [...mats].sort((a, b) => danger(a) - danger(b))[0] : cfg.mat, M = MAT[mat];
  const s = { ...base, mat };
  const r = simulate(s), vd = r.vd, room = G.rooms[cfg.room];
  const t425 = r.t425.none[0], planet = H.kind === 'radial', cabin = H.kind === 'cabin', chain = H.kind === 'chain';
  const has = (...k) => k.some((x) => mats.includes(x));
  const elec = has('silicone');

  // The actions are built once per language (inLang), so the language can change in the middle of an incident.
  const make = () => {
    const rn = roomName(room.n);
    const A = [], add = (who, ico, short, text, dur, src = [], x = {}) => A.push({ n: A.length + 1, who, ico, short, text, dur, src, ...x });
    if (vd.st === 'safe') {
      add('cmd', 'eye', t(`Mirar si hay fuego en ${rn}`, `Check for fire in ${rn}`), t(`<b>Ve a ${rn} y mira si hay humo o fuego.</b>${why(`Con este oxígeno (${nf(s.o2, 1)} %) ${mix ? 'nada de lo que hay' : 'la ' + MATERIALS[cfg.mat].name.toLowerCase()} no debería arder. Compruébalo con tus ojos antes de hacer nada más.`)}`,
        `<b>Go to ${rn} and look for smoke or fire.</b>${why(`At this oxygen level (${nf(s.o2, 1)} %) ${mix ? 'nothing in there' : 'the ' + MATERIALS[cfg.mat].name.toLowerCase()} should not burn. Check with your own eyes before doing anything else.`)}`), 25, [M.kind === 'limit' ? S.bass : S.saffire2]);
      add('eng', 'gas', t('Revisar los detectores', 'Check the detectors'), t(`<b>Revisa los detectores de humo y de gas de ${rn}.</b>${why(`Puede ser algo que se está calentando sin llama${elec ? ', por ejemplo un cable. Si es un cable, corta la corriente de ese circuito' : ''}.`)}`,
        `<b>Check the smoke and gas detectors in ${rn}.</b>${why(`It may be something overheating without a flame${elec ? ', for example a cable. If it is a cable, cut power to that circuit' : ''}.`)}`), 40, [S.same]);
      add('gnd', 'ground', t('Vigilar los datos', 'Watch the data'), t(`<b>Vigilad en pantalla el gas tóxico y el oxígeno de ${rn}.</b>${why(`${H.ground}: avisad a la tripulación si alguno de los dos sube.`)}`,
        `<b>Watch the toxic gas and oxygen readings for ${rn} on screen.</b>${why(`${H.ground}: tell the crew if either one rises.`)}`), 30, [S.urban]);
      add('all', 'o2', t('No subir el oxígeno', 'Do not raise the oxygen'), t(`<b>No subáis el oxígeno.</b>${why('Dejadlo como está hasta saber qué ha pasado.')}`, `<b>Do not raise the oxygen.</b>${why('Leave it as it is until you know what happened.')}`), 20, []);
    } else {
      const Vloc = localVolume(H, s, G);
      const ppCO2 = 1.486 / Vloc, eqCO2 = ppCO2 * 100; // % CO₂ equivalent at sea level
      const o2After = s.o2 * (s.p * Vloc) / (s.p * Vloc + 1.486);
      const lim = M.kind === 'limit' ? vd.lo : null; // oxygen limit measured in BASS-II
      const plume = s.g > 0 ? 50 * Math.sqrt(s.g) : 0; // cm/s
      const pieceCm = mix ? 100 : 50, durMin = r.dur.map((x) => x / 60);
      const co2Risk = eqCO2 >= 10 ? 'high' : eqCO2 >= 3 ? 'mid' : 'low';

      add('all', 'mask', t('Mascarilla puesta', 'Mask on'), t(`<b>Ponte la mascarilla de oxígeno (PBA) ahora, antes que nada.</b>${why(`${t425 != null ? `Un fuego como el de Saffire VI (1,5–3,2 kW) hace subir el monóxido de carbono; en ${cabin ? `esta cabina de ${nf(s.V)} m³` : `${nf(Vloc)} m³ de aire`} pasa de 425 ppm (el límite de la NASA para 1 hora) en <b>${duration(t425)}</b>.` : 'El humo trae monóxido de carbono, un gas tóxico que no se ve.'} ${co2Risk !== 'low' ? `Además, el extintor de CO₂ que vais a usar dejará el aire con el equivalente a un <b>${nf(eqCO2, 0)} % de CO₂</b>${co2Risk === 'high' ? ': sin mascarilla se pierde el conocimiento' : ': sin mascarilla cuesta respirar'}.` : ''}`)}`,
        `<b>Put on your oxygen mask (PBA) now, before anything else.</b>${why(`${t425 != null ? `A Saffire VI-size fire (1.5–3.2 kW) drives carbon monoxide up; in ${cabin ? `this ${nf(s.V)} m³ cabin` : `${nf(Vloc)} m³ of air`} it passes 425 ppm (NASA's 1-hour limit) in <b>${duration(t425)}</b>.` : 'Smoke carries carbon monoxide, a toxic gas you cannot see.'} ${co2Risk !== 'low' ? `On top of that, the CO₂ extinguisher you are about to use will leave the air at the equivalent of <b>${nf(eqCO2, 0)} % CO₂</b>${co2Risk === 'high' ? ': without a mask you can pass out' : ': without a mask it is hard to breathe'}.` : ''}`)}`), 15, [S.urban], { mask: true });

      add('cmd', 'alarm', t(`Dar la alarma · ${rn}`, `Raise the alarm · ${rn}`), t(`<b>Pulsa la alarma de incendio y anuncia por el intercomunicador: «Fuego en ${rn}, arde ${mix ? 'lo que hay en la zona' : MATERIALS[cfg.mat].name.toLowerCase()}».</b>${why(`${r.tDet != null ? `Aquí el sensor de gases avisa a los <b>${duration(r.tDet)}</b>; ` : ''}${s.g === 0 ? 'sin gravedad el humo no sube al detector del techo y la llama es azul y casi invisible: localízala con la cámara térmica, no a ojo. En SAME el humo de microgravedad tenía partículas más grandes que en la Tierra y los detectores las leían mal.' : `con ${nf(s.g, 2)} g el humo sube despacio: localiza el foco con la cámara térmica.`}`)}`,
        `<b>Press the fire alarm and announce on the intercom: "Fire in ${rn}, ${mix ? 'everything in the area' : MATERIALS[cfg.mat].name.toLowerCase()} is burning".</b>${why(`${r.tDet != null ? `Here the gas sensor alarms at <b>${duration(r.tDet)}</b>; ` : ''}${s.g === 0 ? 'without gravity smoke does not rise to the ceiling detector and the flame is blue and almost invisible: find it with the thermal camera, not by eye. In SAME, microgravity smoke had larger particles than on Earth and the detectors misread them.' : `at ${nf(s.g, 2)} g smoke rises slowly: find the hot spot with the thermal camera.`}`)}`), 10, [S.same]);

      // Cut power / fans: silicone means an electrical source; in 0 g below 30 % O₂ stopping the airflow smothers the flame
      const ventCut = r.ventWorks && !elec;
      const cutEs = elec ? `<b>Corta la corriente de ${rn} y después apaga los ventiladores.</b>${why(`${mix ? 'Entre lo que arde hay cables y juntas de silicona' : 'Arde silicona de juntas o cables'}: la fuente de calor es eléctrica y seguirá encendiendo el fuego mientras haya corriente. En Saffire-II la silicona fina ardió entera.`)}`
        : ventCut ? `<b>Apaga los ventiladores de ${rn} y corta su corriente.</b>${why(`Sin gravedad no hay corriente que suba: la llama solo vive del aire que le traen los ventiladores. BASS-II midió que con menos flujo necesita más oxígeno; con ${nf(s.o2, 1)} % de O₂ y el aire quieto, se ahoga sola (estimado: ~30 s).`)}`
          : `<b>Corta la corriente de ${rn}${s.g > 0 ? ' y apaga los ventiladores' : ''}.</b>${why(s.o2 >= 30 ? `Con ${nf(s.o2, 1)} % de O₂ la llama no necesita que le traigan aire: apagar los ventiladores no la ahoga.` : `Con ${nf(s.g, 2)} g el aire caliente sube solo a unos ${nf(plume)} cm/s (estimado): eso alimenta la llama aunque los ventiladores estén apagados.`)}`;
      const cutEn = elec ? `<b>Cut power to ${rn}, then turn off the fans.</b>${why(`${mix ? 'Cables and silicone seals are among what is burning' : 'Silicone from seals or cables is burning'}: the heat source is electrical and will keep relighting the fire while power is on. In Saffire-II the thin silicone burned completely.`)}`
        : ventCut ? `<b>Turn off the fans in ${rn} and cut its power.</b>${why(`Without gravity there is no rising current: the flame lives only on the air the fans bring. BASS-II measured that with less flow it needs more oxygen; at ${nf(s.o2, 1)} % O₂ and still air, it smothers itself (estimate: ~30 s).`)}`
          : `<b>Cut power to ${rn}${s.g > 0 ? ' and turn off the fans' : ''}.</b>${why(s.o2 >= 30 ? `At ${nf(s.o2, 1)} % O₂ the flame does not need air brought to it: turning off the fans does not smother it.` : `At ${nf(s.g, 2)} g hot air rises on its own at about ${nf(plume)} cm/s (estimate): that feeds the flame even with the fans off.`)}`;
      add('eng', ventCut ? 'fan' : 'power', ventCut ? t(`Apagar ventiladores y corriente · ${rn}`, `Fans and power off · ${rn}`) : t(`Cortar la corriente · ${rn}`, `Cut power · ${rn}`), t(cutEs, cutEn),
        elec ? 20 : 30, [elec ? S.saffire2 : ventCut ? S.bass : s.o2 >= 30 ? S.bre : S.zayac], { kills: ventCut });

      const awayRoom = (cfg.room + 3) % G.rooms.length;
      add('ms1', 'away', cabin ? t('Apartarse del fuego', 'Move away from the fire') : t(`Salir de ${rn}`, `Leave ${rn}`), cabin
        ? t(`<b>Apártate del fuego: ve a la zona de ${roomName(G.rooms[awayRoom].n).split(' (')[0].toLowerCase()}, corriente arriba del humo.</b>${why('Junto al fuego el monóxido de carbono está mucho más concentrado que en el resto de la cabina.')}`,
          `<b>Move away from the fire: head to the ${roomName(G.rooms[awayRoom].n).split(' (')[0].toLowerCase()} area, upwind of the smoke.</b>${why('Next to the fire, carbon monoxide is far more concentrated than in the rest of the cabin.')}`)
        : t(`<b>Sal de ${rn}${chain ? ' por la escotilla' : ' hacia el pasillo central'}, por el lado de donde viene el aire.</b>${why('Junto al fuego el monóxido de carbono está mucho más concentrado que en el resto de la nave.')}`,
          `<b>Leave ${rn}${chain ? ' through the hatch' : ' toward the central corridor'}, on the side the air comes from.</b>${why('Next to the fire, carbon monoxide is far more concentrated than in the rest of the spacecraft.')}`), 20, [S.urban], { move: ['ms1', cabin ? awayRoom : 'hub'] });

      if (has('sibal')) add('ms1', 'bags', t('Apartar telas y bolsas', 'Move fabric and bags away'), t(`<b>Aparta las telas y bolsas que haya cerca.</b>${why(`Aquí la llama avanza por la tela a <b>${nf(r.v[0], 1)}–${nf(r.v[1], 1)} mm/s</b> (Saffire-II, corregido con FLEX para este oxígeno y esta presión): una pieza de ${pieceCm} cm se quema entera en ${nf(durMin[0], 0)}–${nf(durMin[1], 0)} min. Quitarle combustible corta su avance.`)}`,
        `<b>Move any nearby fabric and bags away.</b>${why(`Here the flame spreads along fabric at <b>${nf(r.v[0], 1)}–${nf(r.v[1], 1)} mm/s</b> (Saffire-II, corrected with FLEX for this oxygen and pressure): a ${pieceCm} cm piece burns completely in ${nf(durMin[0], 0)}–${nf(durMin[1], 0)} min. Removing fuel stops it spreading.`)}`), 15, [S.saffire2]);
      if (has('pmma_s', 'pmma_r')) add('ms1', 'drops', t('No ponerse delante del acrílico', 'Stay clear of the acrylic'), t(`<b>No te pongas delante de la pieza de acrílico.</b>${why(`En BASS el acrílico hierve por dentro y revienta burbujas que lanzan gotitas encendidas; sin gravedad flotan en cualquier dirección. ${lim != null ? `Su límite medido es ~${nf(lim, 1)} % de O₂ y aquí hay ${nf(s.o2, 1)} %.` : ''}`)}`,
        `<b>Do not stand in front of the acrylic part.</b>${why(`In BASS the acrylic boiled inside and burst bubbles that threw out burning droplets; without gravity they float in any direction. ${lim != null ? `Its measured limit is ~${nf(lim, 1)} % O₂ and there is ${nf(s.o2, 1)} % here.` : ''}`)}`), 10, [S.bass1]);
      if (has('nomex')) add('cmd', 'search', t('Buscar por qué arde', 'Find the cause'), t(`<b>Busca qué ha encendido el fuego.</b>${why(mix ? 'Con telas, plásticos y cables ardiendo juntos, lo más probable es una chispa eléctrica o demasiado oxígeno.' : `En Saffire-II el Nomex ni prendió con ${nf(22.1, 1)} % de O₂, aunque el acrílico de al lado ardió entero: si arde, hay más oxígeno del normal o una fuente eléctrica cerca.`)}`,
        `<b>Find out what started the fire.</b>${why(mix ? 'With fabric, plastic and cables burning together, the most likely cause is an electrical spark or too much oxygen.' : `In Saffire-II Nomex did not even ignite at ${nf(22.1, 1)} % O₂, although the acrylic next to it burned completely: if it burns, there is more oxygen than normal or an electrical source nearby.`)}`), 15, [S.saffire2]);

      const extEs = `Un extintor de CO₂ como el de la ISS (2,7 kg) deja en ${chain ? `este módulo (~${nf(Vloc)} m³)` : `${nf(Vloc)} m³`} el equivalente a un <b>${nf(eqCO2, eqCO2 < 3 ? 1 : 0)} % de CO₂</b> y baja el oxígeno de ${nf(s.o2, 1)} % a <b>${nf(o2After, 1)} %</b>${lim != null ? (o2After < lim ? `, por debajo del límite medido en BASS-II (~${nf(lim, 1)} %): la llama no puede seguir` : `; su límite medido es ~${nf(lim, 1)} %`) : ''}. En FLEX, con CO₂ añadido al aire las llamas se apagaban antes.`;
      const extEn = `A CO₂ extinguisher like the ISS one (2.7 kg) leaves ${chain ? `this module (~${nf(Vloc)} m³)` : `${nf(Vloc)} m³`} at the equivalent of <b>${nf(eqCO2, eqCO2 < 3 ? 1 : 0)} % CO₂</b> and lowers oxygen from ${nf(s.o2, 1)} % to <b>${nf(o2After, 1)} %</b>${lim != null ? (o2After < lim ? `, below the limit measured in BASS-II (~${nf(lim, 1)} %): the flame cannot go on` : `; its measured limit is ~${nf(lim, 1)} %`) : ''}. In FLEX, flames went out sooner with CO₂ added to the air.`;
      add('ms1', 'ext', ventCut ? t('Extintor preparado', 'Extinguisher ready') : t('Usar el extintor', 'Use the extinguisher'), ventCut
        ? t(`<b>Coge el extintor de CO₂; si a los 30 s sigue ardiendo, dispara a la base de la llama.</b>${why(`${extEs} Dispara desde el lado de donde venía el aire, para que el gas vaya hacia la llama.`)}`, `<b>Grab the CO₂ extinguisher; if it is still burning after 30 s, spray the base of the flame.</b>${why(`${extEn} Spray from the side the air was coming from, so the gas is carried onto the flame.`)}`)
        : t(`<b>Usa ya el extintor de CO₂ contra la base de la llama.</b>${why(`${extEs} ${s.g > 0 ? 'Con gravedad la llama sube: apunta abajo. ' : ''}Dispara desde el lado de donde venía el aire.`)}`, `<b>Use the CO₂ extinguisher on the base of the flame now.</b>${why(`${extEn} ${s.g > 0 ? 'With gravity the flame rises: aim low. ' : ''}Spray from the side the air was coming from.`)}`), 45, [S.flex], { kills: !ventCut });

      add('ms2', cabin ? 'suit' : 'refuge', cabin ? t('Preparar los trajes', 'Get the suits ready') : t(`Ir a ${H.refugeName.split(',')[0]}`, `Go to ${H.refugeName.split(',')[0]}`), cabin
        ? t(`<b>Ve al ${H.refugeName.replace(/^el /, '').split(',')[0]} y prepara los trajes.</b>${why(`Los trajes tienen aire propio. En ${nf(s.V)} m³ no hay dónde alejarse del humo: si el aire no se limpia, son la única salida.`)}`, `<b>Go to ${H.refugeName.split(',')[0]} and get the suits ready.</b>${why(`The suits have their own air. In ${nf(s.V)} m³ there is nowhere to get away from the smoke: if the air does not clear, they are the only way out.`)}`)
        : t(`<b>Ve a${H.refugeName.startsWith('el ') ? 'l ' + H.refugeName.slice(3) : ' ' + H.refugeName}${planet ? '' : ' por el pasillo'}.</b>${why(`Es el refugio con aire limpio y su propio soporte vital. No pases por ${rn}.`)}`, `<b>Go to ${H.refugeName}${planet ? '' : ' through the corridor'}.</b>${why(`It is the refuge with clean air and its own life support. Do not go through ${rn}.`)}`), 25, [], { move: ['ms2', cabin ? awayRoom : 'refuge'] });

      const tPlan = r.t425.plan[0];
      add('cmd', cabin ? 'suit' : planet && s.o2 >= 30 ? 'refuge' : 'hatch', cabin ? t('Decidir: trajes o seguir', 'Decide: suits or stay') : planet && s.o2 >= 30 ? t('Preparar la evacuación', 'Prepare to evacuate') : t(`Cerrar ${rn}`, `Close ${rn}`), cabin
        ? t(`<b>Si en 1 minuto el monóxido de carbono sigue por encima de 425 ppm, que todos se pongan el traje.</b>${why(`${tPlan != null ? `Aun con el plan, aquí el CO pasa del límite a los ${duration(tPlan)}: la mascarilla da tiempo, el traje da aire limpio.` : 'Con el plan el CO no debería llegar al límite: vigila la lectura.'} Pide a ${H.ground} estudiar el regreso anticipado.`)}`, `<b>If carbon monoxide is still above 425 ppm after 1 minute, everyone puts on a suit.</b>${why(`${tPlan != null ? `Even with the plan, CO passes the limit here at ${duration(tPlan)}: the mask buys time, the suit gives clean air.` : 'With the plan CO should not reach the limit: watch the reading.'} Ask ${H.ground} to study an early return.`)}`)
        : planet && s.o2 >= 30 ? t(`<b>Si en 1 minuto no se apaga, cierra ${rn} y llevad a todos al rover.</b>${why(`Con ${nf(s.o2, 1)} % de O₂ y ${nf(s.g, 2)} g este fuego puede ser peor que en órbita (Zayac 2024: la Luna puede ser más inflamable). Cerrar el módulo deja al fuego solo con el oxígeno que hay dentro.`)}`, `<b>If it is not out within 1 minute, close ${rn} and get everyone to the rover.</b>${why(`At ${nf(s.o2, 1)} % O₂ and ${nf(s.g, 2)} g this fire can be worse than in orbit (Zayac 2024: the Moon can be more flammable). Closing the module leaves the fire only the oxygen inside it.`)}`)
          : t(`<b>Si 90 s después de la alarma sigue ardiendo, cierra las escotillas de ${rn}.</b>${why(`Aislar el módulo deja al fuego solo con el oxígeno que hay dentro y frena el humo hacia el resto de la estación. Reúne a todos junto a ${H.refugeName.split(' (')[0]}.`)}`, `<b>If it is still burning 90 s after the alarm, close the hatches of ${rn}.</b>${why(`Isolating the module leaves the fire only the oxygen inside it and stops smoke reaching the rest of the station. Gather everyone at ${H.refugeName.split(' (')[0]}.`)}`), 20, [planet ? S.zayac : S.saffire]);

      add('gnd', 'ground', H.delay > 60 ? t('Preparar el análisis', 'Prepare the analysis') : t('Vigilar los datos', 'Watch the data'), H.delay > 60
        ? t(`<b>Preparad el análisis: la tripulación decide sola.</b>${why('La radio tarda entre 3 y 22 minutos en llegar a Marte: cuando llegue vuestro mensaje, todo habrá pasado.')}`, `<b>Prepare the analysis: the crew decides alone.</b>${why('Radio takes 3 to 22 minutes to reach Mars: by the time your message arrives, it will all be over.')}`)
        : t(`<b>Vigilad en pantalla el CO, el CO₂ y el oxígeno de ${rn}.</b>${why(`${H.ground}${H.delay ? ` (la radio tarda ~${nf(H.delay, 1)} s)` : ''}: avisad si el CO pasa de 425 ppm o el oxígeno sube del 23,5 %${chain ? '; tened lista la Dragon por si hay que salir de la estación' : cabin ? '; estudiad volver antes a la Tierra' : ''}.`)}`,
          `<b>Watch CO, CO₂ and oxygen for ${rn} on screen.</b>${why(`${H.ground}${H.delay ? ` (radio delay ~${nf(H.delay, 1)} s)` : ''}: warn if CO passes 425 ppm or oxygen rises above 23.5 %${chain ? '; keep Dragon ready in case the crew must leave the station' : cabin ? '; study an early return to Earth' : ''}.`)}`), 30, [S.urban]);

      const acid = has('silicone', 'pmma_s', 'pmma_r') || mix; // plastics and cable insulation release acid gases
      add('eng', 'gas', t('Medir los gases', 'Measure the gases'), t(`<b>Mide el aire en ${rn} y donde está la tripulación: CO${acid ? ', ácido clorhídrico (HCl), cianuro (HCN)' : ''} y oxígeno.</b>${why(`En la ISS se hace con el analizador de gases de combustión (CSA-CP). Con el CO por debajo de 425 ppm se puede trabajar 1 hora${acid ? '; los plásticos y el aislamiento de cables sueltan además gases ácidos que irritan los pulmones' : ''}. Nadie se quita la mascarilla hasta tener la lectura.`)}`,
        `<b>Measure the air in ${rn} and where the crew is: CO${acid ? ', hydrogen chloride (HCl), hydrogen cyanide (HCN)' : ''} and oxygen.</b>${why(`On the ISS this is done with the combustion products analyzer (CSA-CP). With CO below 425 ppm it is safe to work for 1 hour${acid ? '; plastics and cable insulation also release acid gases that irritate the lungs' : ''}. Nobody takes off their mask until there is a reading.`)}`), 30, [S.urban]);
      add('all', 'watch', t('Vigilar que no se reavive', 'Watch for re-ignition'), t(`<b>Vigilad la zona 10 minutos con el detector de gas encendido.</b>${why(`${(s.g || 0) > 0 ? 'Con poca gravedad la llama es débil y cuesta verla' : 'Sin gravedad pueden quedar llamas casi invisibles'}, y lo quemado sigue caliente: en FLEX la combustión siguió como «llama fría» después de que se apagara la llama visible.`)}`,
        `<b>Watch the area for 10 minutes with the gas detector on.</b>${why(`${(s.g || 0) > 0 ? 'In low gravity the flame is weak and hard to see' : 'Without gravity, almost invisible flames can remain'}, and burnt material stays hot: in FLEX, combustion went on as a "cool flame" after the visible flame went out.`)}`), 600, [S.flex], { watch: true });
    }
    // Always last, in this order: check with your own eyes that it is out, then inspect and report to mission control
    add('cmd', 'eye', t('Comprobar que está apagado', 'Check the fire is out'), t(`<b>Comprueba con tus ojos que el fuego está apagado.</b>${why(`Mira ${rn} de cerca: ni llama, ni brillo, ni humo${s.g === 0 ? ' (sin gravedad la llama es azul y casi invisible)' : ''}. Responde lo que ves.`)}`,
      `<b>Check with your own eyes that the fire is out.</b>${why(`Look closely at ${rn}: no flame, no glow, no smoke${s.g === 0 ? ' (without gravity the flame is blue and almost invisible)' : ''}. Report what you see.`)}`), 30, [S.flex], { ask: true });
    add('cmd', 'report', t('Inspeccionar y avisar al centro de mando', 'Inspect and report to mission control'), t(`<b>Inspecciona los daños de ${rn} y envía el informe al centro de mando.</b>${why(`Qué se ha quemado, qué equipos fallan y si se puede volver a usar ${rn}. ${H.delay > 60 ? 'El mensaje tardará minutos en llegar a la Tierra.' : `El centro de control (${H.ground}) decide los pasos siguientes.`}`)}`,
      `<b>Inspect the damage in ${rn} and send the report to mission control.</b>${why(`What burned, which equipment is failing and whether ${rn} can be used again. ${H.delay > 60 ? 'The message will take minutes to reach Earth.' : `Mission control (${H.ground}) decides the next steps.`}`)}`), 120, [S.urban], { inspect: true });
    return A;
  };

  const A = inLang('es', make), Aen = inLang('en', make);
  A.forEach((a, i) => { a.i18n = { es: { short: a.short, text: a.text }, en: { short: Aen[i].short, text: Aen[i].text } }; Object.assign(a, a.i18n[LANG]); });

  // Timing: each person does their actions one after another; 'all' waits for every crew member
  const free = Object.fromEntries(CREW.map((c) => [c.id, 0]));
  for (const a of A) {
    const who = a.who === 'all' ? CREW.filter((c) => !c.ground).map((c) => c.id) : [a.who];
    a.start = Math.max(...who.map((w) => free[w])); a.end = a.start + a.dur; who.forEach((w) => (free[w] = a.end));
  }
  const kill = A.find((a) => a.kills), total = Math.max(...A.map((a) => a.end));
  return { cfg, H, P, M, G, s, r, vd, A, rn: roomName(room.n), total, outAt: kill ? kill.end + (r.ventWorks ? 30 : 0) : null, cls: classify(s, vd, cfg.mat, r, mats), mat, mats };
}

/** Incident code and severity: fuel type · flame regime · oxygen, and class 0–3 from the time CO takes to reach the limit. */
export function classify(s, vd, mat, r, mats = []) {
  const kinds = [...new Set(mats.map((k) => ({ sibal: t('tela', 'fabric'), nomex: t('tela', 'fabric'), pmma_s: t('plástico', 'plastic'), pmma_r: t('plástico', 'plastic'), silicone: t('cables y juntas', 'cables and seals') })[k]))].join(', ');
  const fuel = mat === 'mix' ? ['S-MIX', t(`arden varias cosas a la vez (${kinds})`, `several things burning at once (${kinds})`)]
    : mat === 'sibal' || mat === 'nomex' ? ['S-TEX', t('arde una tela', 'a fabric is burning')]
      : mat === 'silicone' ? ['S-ELA', t('arde goma o un cable (seguramente fallo eléctrico)', 'rubber or a cable is burning (probably an electrical fault)')]
        : ['S-POL', t('arde un plástico (acrílico)', 'a plastic is burning (acrylic)')];
  const regime = s.g >= 1 ? ['G1-CON', t('llama normal, que sube', 'normal flame, rising')]
    : s.g > 0 ? ['GP-EXT', t('con poca gravedad la llama sube despacio', 'in low gravity the flame rises slowly')]
      : vd.st === 'edge' ? ['μG-LIM', t('llama azul y débil, casi sin oxígeno para seguir', 'weak blue flame, barely enough oxygen to keep going')]
        : s.o2 >= 30 ? ['μG-HOL', t('bola de llama con humo amarillo', 'ball of flame with yellow smoke')]
          : ['μG-ENV', t('llama azul que envuelve el objeto, casi invisible', 'blue flame wrapping the object, almost invisible')];
  const tl = r.t425.none[0];
  const sev = vd.st === 'safe' ? ['0', t('Sin llama esperada', 'No flame expected'), '#4ade80']
    : tl != null && tl < 120 ? ['3', t('CRÍTICA', 'CRITICAL'), '#ff3b3b']
      : tl != null && tl < 600 ? ['2', t('ALTA', 'HIGH'), '#ff9a4a'] : ['1', t('MEDIA', 'MEDIUM'), '#facc15'];
  return { code: `${fuel[0]} · ${regime[0]} · O₂ ${nf(s.o2, 0)}`, fuel: fuel[1], reg: regime[1], sev };
}
