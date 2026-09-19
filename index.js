// index.js
//
// Branchement SDK Gladys <-> pilote Dobiss (src/dobiss.js).
//
// Le protocole Dobiss n'a pas de "discovery" native et ne connaît pas les noms
// des sorties : ils viennent de l'inventaire de l'installation, exporté de la
// configuration Dobiss et stocké dans src/dobiss_config.json.

import fs from 'fs';
import {
  GladysIntegration,
  DEVICE_FEATURE_CATEGORIES,
  DEVICE_FEATURE_TYPES,
  logger,
} from '@gladysassistant/integration-sdk';

import { normalizeConfig, isConfigValid } from './src/config.js';
import { ACTION, sendAction, readStatusBatch } from './src/dobiss.js';

const POLL_INTERVAL_MS = 15000; // fréquence de rafraîchissement de l'état réel
const BATCH_SIZE = 24; // limite du protocole Dobiss par requête groupée

// --- Inventaire des sorties -------------------------------------------------
// Chargé relativement à ce fichier (et non au répertoire courant) pour
// fonctionner à l'identique en local et dans le conteneur Docker.
const inventory = JSON.parse(
  fs.readFileSync(new URL('./src/dobiss_config.json', import.meta.url), 'utf-8'),
);

function buildOutputList() {
  const list = [];
  for (const m of inventory.modules) {
    for (const o of m.outputs) {
      list.push({
        moduleLetter: m.letter,
        output: o.index, // index 0-based envoyé au contrôleur
        nr: o.nr, // numéro affiché dans Dobiss (index + 1)
        description: o.description,
        group: o.group,
        outputType: o.output_type, // 'relay' | 'dimmer' (traité en on/off en v1)
      });
    }
  }
  return list;
}

const outputList = buildOutputList();
logger.info(`Inventaire Dobiss chargé : ${outputList.length} sorties.`);

const gladys = new GladysIntegration();

// La config est relue à chaque appel : gladys.config est rafraîchie par le SDK
// à la connexion et à chaque sauvegarde du formulaire.
function getConfig() {
  const raw = gladys.config ?? {};
  // Tolère l'ancienne clé "ip" (version intermédiaire) en plus de "host".
  return normalizeConfig({ ...raw, host: raw.host ?? raw.ip });
}

// L'identifiant d'un appareil = lettre du module + numéro affiché (ex. "B7").
function platformId(item) {
  return `${item.moduleLetter}${item.nr}`;
}

// Retrouve (module, sortie) depuis un device Gladys. Accepte l'ancien nom de
// paramètre "OUTPUT" pour les appareils créés avec la version intermédiaire.
function getDeviceOutput(device) {
  const param = (name) => device.params?.find((p) => p.name === name)?.value;
  const moduleLetter = param('MODULE_LETTER');
  const output = Number(param('OUTPUT_INDEX') ?? param('OUTPUT'));
  return { moduleLetter, output };
}

// --- Découverte : publication de l'inventaire -------------------------------
gladys.onScanRequest(async () => {
  logger.info(`Publication de ${outputList.length} sorties Dobiss...`);

  const devices = outputList.map((item) => {
    const ids = gladys.externalIds('switch', platformId(item));
    return {
      name: `${item.description} (${item.moduleLetter}${item.nr})`,
      external_id: ids.device,
      params: [
        { name: 'MODULE_LETTER', value: item.moduleLetter },
        { name: 'OUTPUT_INDEX', value: String(item.output) },
      ],
      features: [
        {
          name: 'Marche/Arrêt',
          external_id: ids.feature('binary'),
          category: DEVICE_FEATURE_CATEGORIES.SWITCH,
          type: DEVICE_FEATURE_TYPES.SWITCH.BINARY,
          min: 0,
          max: 1,
          read_only: false,
          has_feedback: true,
          keep_history: true,
        },
      ],
    };
  });

  await gladys.publishDiscoveredDevices(devices);
});

// --- Commande : l'utilisateur allume/éteint depuis Gladys -------------------
gladys.onSetValue(async (device, feature, value) => {
  const config = getConfig();
  if (!isConfigValid(config)) throw new Error('Adresse IP du contrôleur Dobiss non configurée.');

  const { moduleLetter, output } = getDeviceOutput(device);
  if (!moduleLetter || Number.isNaN(output)) {
    throw new Error(`Device Dobiss mal formé: ${device.external_id}`);
  }

  const on = Number(value) ? 1 : 0;
  await sendAction(config.host, config.port, moduleLetter, output, on ? ACTION.ON : ACTION.OFF);
  await gladys.publishState(feature.external_id, on);
});

// --- Poll à la demande d'un appareil (le SDK ne fournit que le device) ------
gladys.onPoll(async (device) => {
  const config = getConfig();
  if (!isConfigValid(config)) return;

  const { moduleLetter, output } = getDeviceOutput(device);
  const feature = device.features?.[0];
  if (!moduleLetter || Number.isNaN(output) || !feature) return;

  const [state] = await readStatusBatch(config.host, config.port, [{ moduleLetter, output }]);
  if (state === undefined || state === 0xff) return;

  await gladys.publishState(feature.external_id, state ? 1 : 0);
});

// --- Polling périodique de tous les appareils créés, par lots de 24 ---------
const lastValues = new Map();
let polling = false;

async function pollAllDevices() {
  if (polling) return; // évite les chevauchements si un cycle précédent traîne
  polling = true;
  try {
    const config = getConfig();
    if (!isConfigValid(config)) return;

    // getDevices() est asynchrone dans le SDK : ne pas oublier le await.
    const devices = await gladys.getDevices();

    const items = [];
    for (const device of devices) {
      const { moduleLetter, output } = getDeviceOutput(device);
      const feature = device.features?.[0];
      if (!moduleLetter || Number.isNaN(output) || !feature) continue;
      items.push({ moduleLetter, output, featureExternalId: feature.external_id });
    }

    for (let i = 0; i < items.length; i += BATCH_SIZE) {
      const batch = items.slice(i, i + BATCH_SIZE);
      try {
        const response = await readStatusBatch(
          config.host,
          config.port,
          batch.map(({ moduleLetter, output }) => ({ moduleLetter, output })),
        );

        const changed = [];
        batch.forEach((it, idx) => {
          const raw = response[idx];
          if (raw === undefined || raw === 0xff) return;
          const val = raw ? 1 : 0;
          if (lastValues.get(it.featureExternalId) !== val) {
            lastValues.set(it.featureExternalId, val);
            changed.push({ device_feature_external_id: it.featureExternalId, state: val });
          }
        });

        if (changed.length > 0) {
          await gladys.publishStates(changed);
        }
      } catch (err) {
        logger.warn(`Erreur de lecture d'état Dobiss (lot ${i}-${i + BATCH_SIZE}): ${err.message}`);
      }
    }
  } finally {
    polling = false;
  }
}

let pollTimer = null;

function startPolling() {
  if (pollTimer) return;
  pollTimer = setInterval(() => {
    pollAllDevices().catch((err) => logger.error(`Erreur de polling Dobiss: ${err.message}`));
  }, POLL_INTERVAL_MS);
}

function stopPolling() {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

// --- Configuration ------------------------------------------------------------
gladys.onConfigUpdated(async () => {
  const config = getConfig();
  logger.info('Configuration Dobiss mise à jour', config);
  await gladys.setConnectionStatus(isConfigValid(config));
});

// --- Cycle de vie -------------------------------------------------------------
gladys.handleShutdown(() => {
  stopPolling();
});

await gladys.connect();
await gladys.setConnectionStatus(isConfigValid(getConfig()));

startPolling();
// Premier relevé d'état peu après la connexion, sans attendre le premier intervalle.
setTimeout(() => {
  pollAllDevices().catch((err) => logger.error(`Erreur de polling initial Dobiss: ${err.message}`));
}, 5000);
