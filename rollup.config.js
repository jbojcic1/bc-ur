import typescript from '@rollup/plugin-typescript';

export default {
    input: 'src/index.ts',
    output: [
        {
            dir: 'dist',
            format: 'es'
        },
        {
            file: 'dist/index.cjs',
            format: 'cjs'
        }
    ],
    plugins: [typescript()]
}