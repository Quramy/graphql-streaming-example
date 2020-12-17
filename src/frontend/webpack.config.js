const path = require('path');
const webpack = require('webpack');

module.exports = function (env) {
  return {
    entry: {
      'react-app': path.resolve(__dirname, 'react-app.tsx'),
      'simple-json-rendering': path.resolve(__dirname, 'simple-json-rendering.ts'),
    },
    output: {
      path: path.resolve(__dirname, '../../public/dist'),
      filename: '[name].js',
    },
    resolve: {
      extensions: ['.ts', '.tsx', '.js'],
    },
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          exclude: /node_modules/,
          loader: 'ts-loader',
          options: {
            transpileOnly: true,
          },
        },
      ],
    },
    devServer: {
      port: 4000,
      contentBase: path.join(__dirname, 'public'),
    },
    devtool: 'source-map',
  };
};
