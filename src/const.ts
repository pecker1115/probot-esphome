export const ORG_ESPHOME = "esphome";
export const REPO_CORE = "esphome";
export const REPO_DOCS = "esphome-docs";
export const REPO_ISSUES = "issues";
export const REPO_FEATURE_REQUESTS = "feature-requests";

export const COMMENT_DEBOUNCE_TIME = 500;

export const entityComponents = [
  "binary_sensor",
  "climate",
  "cover",
  "fan",
  "light",
  "sensor",
  "text_sensor",
  "switch",
  "display",
];

export const coreComponents = entityComponents.concat([
  "adc",
  "api",
  "async_tcp",
  "binary",
  "captive_portal",
  "custom",
  "custom_component",
  "cwww",
  "debug",
  "deep_sleep",
  "ethernet",
  "font",
  "globals",
  "gpio",
  "homeassistant",
  "i2c",
  "image",
  "interval",
  "json",
  "logger",
  "monochromatic",
  "mqtt",
  "network",
  "ota",
  "output",
  "packages",
  "power_supply",
  "script",
  "speed",
  "spi",
  "status",
  "status_led",
  "template",
  "uart",
  "wifi",
]);
