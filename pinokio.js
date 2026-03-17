module.exports = {
  version: "1.0",
  title: "Open-Hivemind",
  description: "Run the Open-Hivemind multi-agent orchestrator locally with Pinokio.",
  menu: async (kernel, info) => {
    const installed = info.exists("node_modules");
    const running = info.running("start.js");

    if (!installed) {
      return [
        {
          default: true,
          icon: "fa-solid fa-download",
          text: "Install dependencies",
          href: "install.js"
        }
      ];
    }

    if (running) {
      return [
        {
          default: true,
          icon: "fa-solid fa-gauge-high",
          text: "Open WebUI",
          href: "http://localhost:5005"
        }
      ];
    }

    return [
      {
        default: true,
        icon: "fa-solid fa-power-off",
        text: "Start",
        href: "start.js"
      },
      {
        icon: "fa-solid fa-plug",
        text: "Update dependencies",
        href: "install.js"
      }
    ];
  }
};
