const CopyPlugin = require('copy-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const path = require('path');

module.exports = {
  mode : 'development',
  entry : './src/app.ts',
  resolve : {extensions : ['.ts', '.js']},
  target : ['web', 'es6'],
  output : {
    filename : 'app.bundle.js',
    // path : path.join(__dirname, 'dist'),
    path : path.join(__dirname, 'docs'),
    clean : true
  },
  devtool : 'source-map',
  module : {
    rules : [{
      test : /\.ts$/,
      loader : 'ts-loader',
      exclude : /node_modules/,
    }]
  },
  optimization : {
    minimize : true,
    minimizer : [new TerserPlugin()],
  },
  plugins : [new CopyPlugin({
            patterns :
                     [
                       {
                         from : path.join(__dirname, 'static/index.html'),
                         to : path.join(__dirname, 'docs/index.html')
                       },
                       {
                         from : path.join(__dirname, 'static/css'),
                         to : path.join(__dirname, 'docs/css')
                       },
                       {
                         from : path.join(__dirname, 'static/images'),
                         to : path.join(__dirname, 'docs/images')
                       },
                       {
                         from : path.join(__dirname, 'static/rulesets/default'),
                         to : path.join(__dirname, 'docs/rulesets/default')
                       },
                     ],
          })],
  stats : 'verbose'
};
