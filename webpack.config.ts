import path from 'path';
import webpack from 'webpack';
import Dotenv from 'dotenv-webpack';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const config: webpack.Configuration = {
  mode: 'development',
  entry: './client/main.js',
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'client'),
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
  },
  plugins: [
    new Dotenv({
      path: './.env', // Path to .env file
      safe: true, // Load '.env.example' to verify the '.env' variables are all set
      systemvars: true, // Load all the predefined 'process.env' variables
      silent: false, // Hide any errors
    }),
    new webpack.DefinePlugin({
      'process.env': JSON.stringify(process.env),
    }),
  ],
};

export default config;
