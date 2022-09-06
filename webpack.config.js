module.exports = {
    externals: {
        react: "React",
        "chrono-node": "ChronoNode"
    },
    mode: "production",
    externalsType: "window",
    entry: './src/index.js',
    output: {
        filename: 'extension.js',
        path: __dirname,
        library: {
            type: "module",
        }
    },
    experiments: {
        outputModule: true,
    },
};
