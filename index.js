// index.js
//
// Branchement SDK Gladys <-> pilote Dobiss (src/dobiss.js).
//
// Le protocole Dobiss n'a pas de "discovery" native : readStatusBatch()
// répond 0xFF pour un emplacement de sortie inexistant. On s'en sert donc
// pour balayer les 18 modules possibles (lettres A à R) et détecter les
// sorties réellement présentes.

import {
  GladysIntegration,
  DEVICE_FEATURE_CATEGORIES,
  DEVICE_FEATURE_TYPES,
  logger,
} from "@gladysassistant/integration-sdk";

import { normalizeConfig, isConfigValid } from "./src/config.js";
import { ACTION, sendAction, readStatusBatch } from "./src/dobiss.js";

// Lettres de module valides : A (module 1) à R (module 18).
const MODULE_LETTERS = Array.from({ length: 18 }, (_, i) =>
  String.fromCharCode(65 + i),
);

// readStatusBatch accepte jusqu'à 24 items par appel : on balaie donc,
// pour chaque module, les sorties 0 à 23 en un seul appel.
const OUTPUTS_PER_SCAN = 24;

const gladys = new GladysIntegration();

let config = normalizeConfig(await gladys.getConfig());

/**
 * Construit l'external_id d'une sortie à partir de sa lettre de module et
 * de son index, et inversement retrouve (moduleLetter, output) à partir
 * d'un device Gladys.
 */
function outputPlatformId(moduleLetter, output) {
  return `${moduleLetter}${output}`;
}

function getDeviceOutput(device) {
  const moduleLetter = device.params?.find(
    (p) => p.name === "MODULE_LETTER",
  )?.value;
  const output = Number(
    device.params?.find((p) => p.name === "OUTPUT_INDEX")?.value,
  );
  return { moduleLetter, output };
}

// --- Découverte : balayage de tous les modules/sorties ---------------------
gladys.onScanRequest(async () => {
  if (!isConfigValid(config)) {
    logger.warn("Config Dobiss incomplète (host manquant), scan annulé.");
    return;
  }

  const devices = [];

  for (const moduleLetter of MODULE_LETTERS) {
    const items = Array.from({ length: OUTPUTS_PER_SCAN }, (_, output) => ({
      moduleLetter,
      output,
    }));

    let statuses;
    try {
      statuses = await readStatusBatch(config.host, config.port, items);
    } catch (err) {
      logger.warn(
        `Module ${moduleLetter} injoignable pendant le scan: ${err.message}`,
      );
      continue; // on continue le balayage même si un module ne répond pas
    }

    statuses.forEach((state, output) => {
      if (state === 0xff) return; // emplacement inutilisé

      const ids = gladys.externalIds(
        "dobiss-output",
        outputPlatformId(moduleLetter, output),
      );
      devices.push({
        name: `Dobiss ${moduleLetter}${output}`,
        external_id: ids.device,
        params: [
          { name: "MODULE_LETTER", value: moduleLetter },
          { name: "OUTPUT_INDEX", value: String(output) },
        ],
        features: [
          {
            name: "On/Off",
            external_id: ids.feature("binary"),
            category: DEVICE_FEATURE_CATEGORIES.SWITCH,
            type: DEVICE_FEATURE_TYPES.SWITCH.BINARY,
            min: 0,
            max: 1,
            read_only: false,
            has_feedback: true,
            keep_history: true,
            should_poll: true,
            poll_frequency: 30,
          },
        ],
      });
    });
  }

  logger.info(`Scan terminé : ${devices.length} sortie(s) Dobiss détectée(s).`);
  await gladys.publishDiscoveredDevices(devices);
});

// --- Commande : l'utilisateur allume/éteint depuis Gladys -------------------
gladys.onSetValue(async (device, feature, value) => {
  const { moduleLetter, output } = getDeviceOutput(device);
  if (!moduleLetter || Number.isNaN(output)) {
    throw new Error(`Device Dobiss mal formé: ${device.external_id}`);
  }

  const action = value ? ACTION.ON : ACTION.OFF;
  await sendAction(config.host, config.port, moduleLetter, output, action);
  await gladys.publishState(feature.external_id, value);
});

// --- Lecture périodique de l'état réel (une sortie à la fois) --------------
gladys.onPoll(async (device, feature) => {
  const { moduleLetter, output } = getDeviceOutput(device);
  if (!moduleLetter || Number.isNaN(output)) return;

  const [state] = await readStatusBatch(config.host, config.port, [
    { moduleLetter, output },
  ]);
  if (state === undefined || state === 0xff) return;

  await gladys.publishState(feature.external_id, state);
});

// --- Configuration ------------------------------------------------------------
gladys.onConfigUpdated(async (rawConfig) => {
  config = normalizeConfig(rawConfig);
  logger.info("Configuration Dobiss mise à jour", config);
  await gladys.setConnectionStatus(isConfigValid(config));
});

gladys.handleShutdown();

await gladys.connect();
await gladys.setConnectionStatus(isConfigValid(config));
