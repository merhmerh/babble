const path = require('path')
const Dotenv = require('dotenv-webpack');

const config = {
    entry: {
        app: '/src/app.js',
    },
    output: {
        path: path.resolve(__dirname, 'scripts'),
        filename: '[name].js'
    },
    target: 'web',
    module: {
        rules: [
            {
                test: /\.css$/,
                use: [
                    'style-loader',
                    'css-loader'
                ]
            },
            {
                test: /\.html$/i,
                loader: "html-loader",
                options: {
                    sources: false
                }
            },
        ]
    },
    plugins: [
        new Dotenv({
            path: './.env'
        })
    ],
    watch: true,
    experiments: {
        topLevelAwait: true,
    },

}

module.exports = (env, argv) => {
    if (argv.mode === 'development') {
        config.devtool = 'eval-source-map';
    }

    if (argv.mode === 'production') {
        //...
    }

    return config;
};