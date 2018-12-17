const nodeExternals = require('webpack-node-externals');
const path = require('path');
const DotenvPlugin = require('webpack-dotenv-plugin');


module.exports = {
  entry: {
    server: './server.js',
  },
  target: 'node',
  externals: [nodeExternals()],
  plugins: [new DotenvPlugin({
    sample: './.env',
    path: './.env',
  })],
  mode: 'production',
  output: {
    libraryTarget: 'commonjs',
    path: path.join(__dirname, 'dist'),
    filename: '[name].js',
  },
};