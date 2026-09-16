// src/config.js
//
// Normalise la configuration stockée par Gladys pour cette intégration.
// D'après le README du projet, l'écran de configuration Gladys ne collecte
// que deux champs :
//   - host : adresse IP du contrôleur Dobiss sur le réseau local
//   - port : port de communication du contrôleur Dobiss (souvent 10001
//            sur les interfaces IP "CAN Programmer" Dobiss)
//
// Si votre gladys-assistant-integration.json définit des clés différentes
// (ou en ajoute d'autres), ajustez ce fichier en conséquence : les clés ici
// doivent correspondre exactement aux `key` déclarées dans le `config_schema`
// du manifest.

const DEFAULT_PORT = 10001;

// Valeurs par défaut, tenues en phase avec les `default` du config_schema
// dans gladys-assistant-integration.json (voir test/manifest.test.js).
const DEFAULT_CONFIG = {
  port: DEFAULT_PORT,
};

/**
 * Normalise et valide la config brute renvoyée par gladys.getConfig() /
 * reçue dans onConfigUpdated(config).
 */
function normalizeConfig(rawConfig = {}) {
  const host = typeof rawConfig.host === 'string' ? rawConfig.host.trim() : '';

  const parsedPort = Number(rawConfig.port);
  const port = Number.isFinite(parsedPort) && parsedPort > 0 ? parsedPort : DEFAULT_PORT;

  return { host, port };
}

/**
 * Vrai si la config contient au minimum une adresse IP exploitable.
 */
function isConfigValid(config) {
  return Boolean(config && config.host);
}

export { normalizeConfig, isConfigValid, DEFAULT_PORT, DEFAULT_CONFIG };
