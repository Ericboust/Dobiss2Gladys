import net from 'net';

/**
 * Protocole TCP Dobiss MAX200 (gamme SX Evolution) - on/off uniquement.
 *
 * Reconstruit par rétro-ingénierie de Max-Touch.exe (l'application de
 * contrôle officielle) et VALIDÉ en conditions réelles (relais physiques
 * basculés avec succès, lecture d'état confirmée sur 108 sorties réelles).
 *
 * - COMMANDE (on/off/toggle) : en-tête fixe 16 octets
 *     ED 43 31 00×11 AF AF
 *   suivi d'un corps de 3 octets : [adresseModule, sortie, action]
 *     adresseModule : lettre ASCII A-R (module 1 = 'A' = 0x41 ... module 18 = 'R' = 0x52)
 *     sortie        : index 0-based de la sortie sur le module
 *     action        : 0x00 = OFF, 0x01 = ON, 0x02 = TOGGLE
 *
 * - LECTURE D'ÉTAT (groupée, jusqu'à 24 sorties par requête) : en-tête fixe 16 octets
 *     ED 63 30 FF×11 AF AF
 *   suivi d'un corps de 48 octets : jusqu'à 24 paires [adresseModule, sortie],
 *   complété par 0xFF,0xFF pour les emplacements inutilisés.
 *   La réponse contient un octet d'état par paire demandée, dans le même ordre
 *   (0 ou 1 pour un relais, 0xFF = emplacement inutilisé).
 *
 * NOTE v1 : les sorties variateur (dimmer) des modules Ambiance (I, J) sont
 * pilotées ici en simple on/off (action ON/OFF), comme le fait déjà
 * l'utilisateur au quotidien. Le contrôle fin de la luminosité (0-100%)
 * pourra être ajouté dans une v2.
 */

const ACTION_HEADER = Buffer.from([
  0xed, 0x43, 0x31, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xaf, 0xaf,
]);

const STATUS_HEADER = Buffer.from([0xed, 0x63, 0x30, ...Array(11).fill(0xff), 0xaf, 0xaf]);

// Message ajouté aux erreurs de timeout : certains outils Dobiss (Max-Touch,
// MaxTool) prennent le contrôle exclusif de la connexion TCP au contrôleur.
const BUSY_HINT =
  "la centrale ne répond pas. Vérifie qu'aucune autre application (Max-Touch, MaxTool, un ancien connecteur) " +
  "n'est déjà connectée : certains outils Dobiss (comme MaxTool) prennent le contrôle exclusif " +
  "de la connexion et bloquent les autres clients tant qu'ils sont ouverts.";

export const ACTION = {
  OFF: 0x00,
  ON: 0x01,
  TOGGLE: 0x02,
};

export function moduleLetterToAddress(letter) {
  return letter.toUpperCase().charCodeAt(0);
}

/**
 * Envoie une commande on/off/toggle à une sortie.
 * @param {string} host
 * @param {number} port
 * @param {string} moduleLetter - 'A'..'R'
 * @param {number} output - index 0-based
 * @param {number} action - ACTION.ON, ACTION.OFF ou ACTION.TOGGLE
 * @param {number} timeoutMs
 */
export function sendAction(host, port, moduleLetter, output, action, timeoutMs = 3000) {
  return new Promise((resolve, reject) => {
    const socket = new net.Socket();
    let settled = false;

    const finish = (fn, arg) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      socket.destroy();
      fn(arg);
    };

    const timer = setTimeout(
      () => finish(reject, new Error(`Timeout envoi commande vers ${host}:${port} — ${BUSY_HINT}`)),
      timeoutMs,
    );

    socket.once('error', (err) => finish(reject, err));

    socket.connect(port, host, () => {
      const addr = moduleLetterToAddress(moduleLetter);
      const body = Buffer.from([addr & 0xff, output & 0xff, action & 0xff]);
      socket.write(ACTION_HEADER);
      socket.write(body, () => finish(resolve, undefined));
    });
  });
}

/**
 * Lit l'état réel (0/1) d'un lot de sorties (max 24 par appel).
 * @param {string} host
 * @param {number} port
 * @param {{moduleLetter: string, output: number}[]} items
 * @param {number} timeoutMs
 * @returns {Promise<Buffer>} un octet d'état par item demandé (même ordre), max 24 octets
 */
export function readStatusBatch(host, port, items, timeoutMs = 3000) {
  return new Promise((resolve, reject) => {
    if (items.length === 0) {
      resolve(Buffer.alloc(0));
      return;
    }
    if (items.length > 24) {
      reject(new Error('readStatusBatch: 24 items maximum par appel'));
      return;
    }

    const socket = new net.Socket();
    let settled = false;
    let received = Buffer.alloc(0);

    const finish = (fn, arg) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      socket.destroy();
      fn(arg);
    };

    const timer = setTimeout(
      () => finish(reject, new Error(`Timeout lecture état vers ${host}:${port} — ${BUSY_HINT}`)),
      timeoutMs,
    );

    socket.once('error', (err) => finish(reject, err));

    socket.on('data', (chunk) => {
      received = Buffer.concat([received, chunk]);
      if (received.length >= items.length) {
        finish(resolve, received.subarray(0, items.length));
      }
    });

    socket.connect(port, host, () => {
      const body = Buffer.alloc(48, 0xff);
      items.forEach((it, i) => {
        body[i * 2] = moduleLetterToAddress(it.moduleLetter);
        body[i * 2 + 1] = it.output & 0xff;
      });
      socket.write(STATUS_HEADER);
      socket.write(body);
    });
  });
}
