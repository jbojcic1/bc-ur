import typescript from '@rollup/plugin-typescript';

export default {
    input: 'src/index.ts',
    output: [
        {
            file: 'dist/index.js',
            format: 'es'
        },
        {
            file: 'dist/index.cjs',
            format: 'cjs'
        }
    ],
    plugins: [typescript()]
}