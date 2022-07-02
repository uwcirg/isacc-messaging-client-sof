module.exports = {
    entry: './src/index.tsx',
    output: {
        filename: 'bundle.js',
    },
    devServer: {
        contentBase: '.',
        host: '192.168.50.105',
        disableHostCheck: true,
        port: 3000,
    },
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                use: 'ts-loader',
                exclude: /node_modules/,
            },
        ]
    },
    resolve: {
        extensions: ['.tsx', '.ts', '.js'],
    }
}