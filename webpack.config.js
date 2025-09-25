const path = require('path');
const webpack = require('webpack');
const Dotenv = require('dotenv-webpack');
require('dotenv').config({ path: './.env' });

module.exports = {
  entry: './client/src/App.tsx',
  output: {
    filename: 'build/bundle.js',
    path: path.resolve(__dirname, 'client'),
    publicPath: '/',
    assetModuleFilename: 'assets/[name][ext]',
    chunkFilename: 'build/[name].js',
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.scss'],
    alias: { '/png': path.resolve(__dirname, 'client/png') },
  },
  mode: 'development',
  module: {
    rules: [
      { test: /\.html$/, use: [{ loader: 'html-loader', options: { minimize: true } }] },
      { test: /\.(png|svg|jpg|jpeg|gif)$/i, type: 'asset/resource' },
      { test: /\.js$/, exclude: /node_modules/, use: { loader: 'babel-loader', options: { presets: ['@babel/preset-env'] } } },
      { test: /\.tsx?$/, use: 'ts-loader', exclude: /node_modules/ },
      { test: /\.scss$/, use: ['style-loader', 'css-loader', 'sass-loader'] },
      { test: /\.css$/, use: ['style-loader', { loader: 'css-loader', options: { url: true } }] },
    ],
  },
  optimization: { splitChunks: false },
  plugins: [
    new Dotenv({ path: './.env', safe: false, systemvars: true, silent: false }),
    new webpack.DefinePlugin({
      __CDN_BASE__: JSON.stringify(process.env.ASSET_BASE_URL),
    }),
  ],
};
