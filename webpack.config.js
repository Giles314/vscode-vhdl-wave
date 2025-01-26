// Generated using webpack-cli https://github.com/webpack/webpack-cli

const path = require('path');


const config = {
    entry: './src/vhdlWave.js',
    output: {
        path: path.resolve(__dirname, 'dist'),
    },
    externals: {
        vscode: 'commonjs vscode',
    },
    module: {
        rules: [
            {
                test: /\.(eot|svg|ttf|woff|woff2|png|jpg|gif)$/i,
                type: 'asset',
                exclude: [ path.resolve(__dirname, 'demo'), ] , 
            },

            // Add your rules for custom modules here
            // Learn more about loaders from https://webpack.js.org/loaders/
        ],
    },
    target : 'node'
};
module.exports = config;
