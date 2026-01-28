const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const ReactRefreshWebpackPlugin = require('@pmmmwh/react-refresh-webpack-plugin');

const isDev = process.env.NODE_ENV !== 'production';

module.exports = {
  mode: isDev ? 'development' : 'production',
  entry: './src/renderer/index.tsx',
  target: 'electron-renderer',
  devtool: isDev ? 'eval-source-map' : 'source-map',
  
  output: {
    path: path.resolve(__dirname, 'dist/renderer'),
    filename: isDev ? '[name].js' : '[name].[contenthash].js',
    clean: true
  },
  
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx'],
    alias: {
      '@': path.resolve(__dirname, 'src/renderer'),
      '@shared': path.resolve(__dirname, 'src/shared')
    }
  },
  
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            plugins: isDev ? ['react-refresh/babel'] : []
          }
        }
      },
      {
        test: /\.scss$/,
        use: [
          isDev ? 'style-loader' : MiniCssExtractPlugin.loader,
          'css-loader',
          'sass-loader'
        ]
      },
      {
        test: /\.css$/,
        use: [
          isDev ? 'style-loader' : MiniCssExtractPlugin.loader,
          'css-loader'
        ]
      },
      {
        test: /\.(png|jpe?g|gif|svg|ico)$/i,
        type: 'asset/resource'
      },
      {
        test: /\.(woff|woff2|eot|ttf|otf)$/i,
        type: 'asset/resource'
      }
    ]
  },
  
  plugins: [
    new HtmlWebpackPlugin({
      template: './src/renderer/index.html',
      filename: 'index.html'
    }),
    !isDev && new MiniCssExtractPlugin({
      filename: '[name].[contenthash].css'
    }),
    isDev && new ReactRefreshWebpackPlugin()
  ].filter(Boolean),
  
  devServer: {
    static: {
      directory: path.join(__dirname, 'dist/renderer')
    },
    hot: true,
    port: 3000,
    historyApiFallback: true,
    devMiddleware: {
      writeToDisk: true
    }
  },
  
  optimization: {
    splitChunks: {
      chunks: 'all'
    }
  }
};
