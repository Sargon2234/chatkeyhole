const nodeExternals = require('webpack-node-externals');
const path = require('path');
const DotenvPlugin = require('webpack-dotenv-plugin');

let plugin = [];

if (process.env.NEED_ENV) {
  plugin = [new DotenvPlugin({
    sample: './.env',
    path: './.env',
  })];
}

module.exports = {
  entry: {
    server: './server.js',
  },
  target: 'node',
  externals: [nodeExternals()],
  plugins: plugin,
  mode: 'production',
  output: {
    libraryTarget: 'commonjs',
    path: path.join(__dirname, 'dist'),
    filename: '[name].js',
  },
};