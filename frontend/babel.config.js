// Expo SDK 58 + React Native 0.88: babel-preset-expo handles Worklets.
module.exports = function (api) {
  api.cache(true);
  return { presets: ['babel-preset-expo'] };
};
