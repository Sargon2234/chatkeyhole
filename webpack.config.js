const nodeExternals = require('webpack-node-externals'),
    path = require('path');

module.exports = {
  entry: {
    server: './server.js',
  },
  target: 'node',
  externals: [nodeExternals()],
  mode: 'production',
  output: {
    libraryTarget: 'commonjs',
    path: path.join(__dirname, 'dist'),
    filename: '[name].js',
  },
};