# Dobiss2Gladys

Dobiss2Gladys est une intégration externe pour Gladys Assistant permettant de piloter un système domotique Dobiss depuis Gladys. Elle est pensée principalement pour le contrôle de l'éclairage, mais peut aussi exposer et synchroniser d'autres circuits électriques Dobiss compatibles disponibles sur le contrôleur.

L'intégration s'exécute dans un conteneur Docker et se connecte au contrôleur Dobiss MAX200 sur le réseau local à l'aide de son adresse IP et de son port. Une fois configurée dans Gladys Assistant, elle peut découvrir les équipements pris en charge et les rendre disponibles dans Gladys pour le pilotage, les scènes, les tableaux de bord et les automatismes.

Pour l'utiliser, il faut une version récente de Gladys Assistant, un contrôleur Dobiss accessible sur le réseau local, ainsi que ses paramètres réseau. Un exemple courant est un contrôleur joignable à l'adresse `192.168.1.50` sur le port `10001`. Après installation, il suffit de renseigner l'IP et le port dans l'écran de configuration, d'enregistrer, puis de lancer la découverte si nécessaire.

Dobiss2Gladys a pour objectif d'offrir un pont simple et propre entre une installation Dobiss existante et Gladys Assistant, sans modifier le cœur de Gladys, via le mécanisme officiel d'intégrations externes packagées.
