const path = require('path');

module.exports = {
  mode: process.env.NODE_ENV || 'development',
  entry: './src/main/index.ts',
  target: 'electron-main',
  devtool: 'source-map',
  
  output: {
    path: path.resolve(__dirname, 'dist/main'),
    filename: 'index.js'
  },
  
  resolve: {
    extensions: ['.ts', '.tsx', '.js'],
    alias: {
      '@main': path.resolve(__dirname, 'src/main'),
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
  
  node: {
    __dirname: false,
    __filename: false
  },
  
  externals: {
    'electron': 'commonjs electron',
    'bonjour-service': 'commonjs bonjour-service',
    'ws': 'commonjs ws'
  }
};
