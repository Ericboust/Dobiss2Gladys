# Dobiss2Gladys

Dobiss2Gladys is an external integration for Gladys Assistant that allows you to control a Dobiss home automation system from Gladys. It is mainly focused on lighting control, but it can also expose and synchronize other compatible Dobiss electrical circuits available on the controller.

The integration runs as a Docker container and connects to the Dobiss MAX200 controller over the local network using its IP address and port. Once configured in Gladys Assistant, the integration can discover supported devices and make them available in Gladys for control, scenes, dashboards and automations.

To use it, you need a recent version of Gladys Assistant, a reachable Dobiss controller on your LAN, and its network settings. A common example is a controller available at `192.168.1.50` on port `10001`. After installation, simply enter the IP address and port in the configuration screen, save, and start discovery if needed.

Dobiss2Gladys is designed to provide a simple and clean bridge between an existing Dobiss installation and Gladys Assistant without modifying Gladys core, using the official packaged external integration mechanism.
