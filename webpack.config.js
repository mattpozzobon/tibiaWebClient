const path = require('path');
const Dotenv = require('dotenv-webpack');

module.exports = {
  entry: {
    main: './client/src/index.ts',
    react: './client/src/react-bundle.tsx'
  },
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, 'client'),
  },
  resolve: {
    extensions: [".ts", ".tsx", ".js"]
  },
  mode: 'development',
  module: {
    rules: [
      {
        test: /\.html$/,
        use: [
          {
            loader: 'html-loader',
            options: {
              minimize: true,
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
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  optimization: {
    splitChunks: false,
  },
  plugins: [
    new Dotenv({
      path: './.env',
      safe: false,
      systemvars: true,
      silent: false,
    }),
  ],
};
