module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      // jsxImportSource lets NativeWind process the `className` prop on components.
      ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
      'nativewind/babel',
    ],
  };
};
