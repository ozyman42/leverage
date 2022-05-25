const nrwlConfig = require("@nrwl/react/plugins/webpack.js");
const webpack = require('webpack');

module.exports = (config, context) => {
  nrwlConfig(config);
  return {
    ...config,
    resolve: {
        ...config.resolve,
        fallback: {
            assert: require.resolve("assert/"),
            buffer: require.resolve("buffer/"),
            constants: require.resolve("constants-browserify"),
            crypto: require.resolve("crypto-browserify"),
            process: require.resolve("process/browser"),
            stream: require.resolve("stream-browserify")
        }
    },
    plugins: [
        new webpack.ProvidePlugin({
            Buffer: ['buffer', 'Buffer'],
            process: 'process/browser'
        }),
        ...config.plugins
    ]
  };
};