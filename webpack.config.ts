import path from 'path';
import type { Configuration } from 'webpack';

const config: Configuration = {
  entry: './client/src/index.ts', // Adjust the entry point as needed
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'client'),
  },
  resolve: {
    extensions: [".ts", ".tsx", ".js"] // Resolve TypeScript & JavaScript files
  },
  mode: 'development', // Use 'production' for optimized builds
  module: {
    rules: [
      {
        test: /\.html$/,
        use: [
          {
            loader: 'html-loader',
            options: {
              minimize: true, // Minify HTML files
            },
          },
        ],
      },
      {
        test: /\.(png|svg|jpg|jpeg|gif)$/i,
        type: 'asset/resource',
      },
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env'],
          },
        },
      },
      {
        test: /\.tsx?$/,
        use: "ts-loader",
        exclude: /node_modules/
      }
      // Add loaders for CSS, images, etc., as needed
    ],
  },
  optimization: {
    splitChunks: false, // Prevent Webpack from chunking files
  },
};

export default config;
