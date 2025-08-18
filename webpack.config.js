import path from "path";
import { fileURLToPath } from 'url';

import webpack from "webpack";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default {
  mode: 'production',
  entry: './overrideScript.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'override.js',
    library: {
      type: 'module'
    },
  },
  experiments: {
    outputModule: true
},
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env']
          }
        }
      }
    ]
  },
    plugins: [
    // fix "process is not defined" error:
    new webpack.ProvidePlugin({
      process: 'process/browser',
    }),
  ]
};
