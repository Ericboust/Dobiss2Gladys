# Dobiss2Gladys

Intégration externe pour [Gladys Assistant](https://gladysassistant.com) permettant de piloter un système domotique **Dobiss** directement depuis Gladys.

## À propos

[Dobiss](https://www.dobiss.com) est un système domotique modulaire, principalement utilisé en Belgique, qui gère l'éclairage (et d'autres circuits électriques) via un contrôleur central relié au réseau local. Cette intégration connecte Gladys Assistant à ce contrôleur afin de :

- Découvrir automatiquement les sorties/circuits configurés sur le contrôleur Dobiss
- Allumer, éteindre et piloter l'éclairage depuis Gladys (scénarios, tableau de bord, commandes vocales, etc.)
- Synchroniser l'état réel des appareils Dobiss avec Gladys

## Fonctionnement

L'intégration tourne dans un conteneur Docker isolé, se connecte au contrôleur Dobiss sur le réseau local (adresse IP + port), et communique avec Gladys via l'API d'intégration externe (REST + WebSocket) grâce au SDK officiel `integration-template-js`.

## Prérequis

- Une instance Gladys Assistant à jour (v4.86.0 ou supérieure)
- Un contrôleur Dobiss accessible sur le réseau local
- L'adresse IP et le port du contrôleur Dobiss

## Installation

1. Depuis le **Store** de Gladys Assistant, recherchez `Dobiss2Gladys`
2. Cliquez sur **Installer**
3. Renseignez l'adresse IP et le port de votre contrôleur Dobiss
4. Validez — les circuits Dobiss apparaissent automatiquement comme appareils dans Gladys

> L'intégration peut aussi être installée manuellement avant son indexation, en renseignant l'URL de ce dépôt GitHub dans Gladys.

## Configuration

| Champ | Description |
|---|---|
| `host` | Adresse IP du contrôleur Dobiss sur le réseau local |
| `port` | Port de communication du contrôleur Dobiss |

## Développement local

```bash
git clone https://github.com/Ericboust/Dobiss2Gladys.git
cd Dobiss2Gladys
npm install
npm start
```

Voir la documentation développeur Gladys pour plus de détails sur le SDK utilisé : https://gladysassistant.com/fr/docs/dev/external-integrations/

## Documentation utilisateur

- [English](./docs/en.md)
- [Français](./docs/fr.md)

## Licence

MIT

## Auteur

[Ericboust](https://github.com/Ericboust)
