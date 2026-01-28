const path = require('path');

module.exports = {
  mode: process.env.NODE_ENV || 'development',
  entry: './src/preload/index.ts',
  target: 'electron-preload',
  devtool: 'source-map',
  
  output: {
    path: path.resolve(__dirname, 'dist/preload'),
    filename: 'index.js'
  },
  
  resolve: {
    extensions: ['.ts', '.tsx', '.js'],
    alias: {
      '@shared': path.resolve(__dirname, 'src/shared')
    }
  },
  
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader'
        }
      }
    ]
  },
  
  externals: {
    'electron': 'commonjs electron'
  }
};
