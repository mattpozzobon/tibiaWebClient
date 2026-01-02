const path = require('path');
const webpack = require('webpack');
const Dotenv = require('dotenv-webpack');

// Only load local .env during local development
if (process.env.NETLIFY !== 'true') {
  require('dotenv').config({ path: './.env' });
}

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
    new Dotenv({
      // On Netlify, rely on environment variables (no .env file)
      systemvars: true,
      // Only read .env locally (NETLIFY builds won't have it)
      path: process.env.NETLIFY === 'true' ? undefined : './.env',
      // Only expose these into the browser bundle
      allowlist: [
        'ASSET_BASE_URL',
        'SERVER_HOST',
        'SERVER_PORT',
        'DATABASE_NAME',
        'DATABASE_VERSION',
        'REQUIRED_FILES',
        'FILE_VERSIONS_KEY',
        'FIREBASE_API_KEY',
        'FIREBASE_AUTH_DOMAIN',
        'FIREBASE_PROJECT_ID',
        'FIREBASE_STORAGE_BUCKET',
        'FIREBASE_MESSAGING_SENDER_ID',
        'FIREBASE_APP_ID',
      ],
      silent: true,
    }),

    // Keep your constant for client code
    new webpack.DefinePlugin({
      __CDN_BASE__: JSON.stringify(process.env.ASSET_BASE_URL),
    }),
  ],
};
