# Dobiss2Gladys

Dobiss2Gladys is an external integration for [Gladys Assistant](https://gladysassistant.com) that allows you to control a **Dobiss** home automation system directly from Gladys.

## About

Dobiss is a modular home automation system mainly used to control lighting and other electrical circuits through a central controller connected to the local network. This integration connects Gladys Assistant to a Dobiss MAX200 controller so that compatible circuits can be discovered, controlled and synchronized from Gladys.

The integration uses the official Gladys external integration mechanism and runs as a Docker container. It communicates with the Dobiss controller over the local network using its IP address and port, and with Gladys through the external integrations API.

## Features

- Discover compatible Dobiss circuits
- Control lights from Gladys
- Synchronize circuit states with Gladys
- Use Dobiss devices in dashboards, scenes and automations
- Run as a packaged external integration without modifying Gladys core

## Requirements

- Gladys Assistant `v4.86.0` or later
- A reachable Dobiss MAX200 controller on your local network
- The controller IP address and port
- Network access between Gladys and the Dobiss controller

## Installation

Once published in the Gladys integrations catalog:

1. Open the Gladys Assistant Store
2. Search for `Dobiss2Gladys`
3. Install the integration
4. Enter the Dobiss controller IP address and port
5. Save the configuration
6. Launch device discovery if needed

## Configuration

| Key | Description | Example |
|---|---|---|
| `host` | IP address of the Dobiss MAX200 controller | `192.168.1.50` |
| `port` | Communication port of the controller | `10001` |

## Local development

```bash
git clone https://github.com/ericboust/dobiss2gladys.git
cd dobiss2gladys
npm install
npm start
```

This project is based on the official Gladys external integrations JavaScript template.

Gladys developer documentation: https://gladysassistant.com/fr/docs/dev/external-integrations/

## User documentation

- [English](./docs/en.md)
- [Français](./docs/fr.md)

## Cover image

The `cover.jpg` file must be stored at the root of the repository so it can be referenced by the integration manifest. For publication, an original visual inspired by the Gladys and Dobiss smart-home universes is recommended rather than reusing official logos as-is.

## License

MIT

## Author

[Ericboust](https://github.com/ericboust)
