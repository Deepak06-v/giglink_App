const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);
// Disable package exports which can cause resolution issues with some native modules
config.resolver.unstable_enablePackageExports = false;

module.exports = config;
