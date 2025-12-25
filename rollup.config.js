
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';
import peerDepsExternal from 'rollup-plugin-peer-deps-external';
import postcss from 'rollup-plugin-postcss';
import serve from 'rollup-plugin-serve';

export default {
  input: 'src/index.tsx',
  output: [
    {
      file: 'dist/index.js',
      format: 'cjs',
      sourcemap: true,
      exports: 'named',
    },
    {
      file: 'dist/index.esm.js',
      format: 'esm',
      sourcemap: true,
    },
    {
      file: 'dist/index.umd.js',
      format: 'umd',
      name: 'ReactRiyils',
      sourcemap: true,
      globals: {
        react: 'React',
        'react-dom': 'ReactDOM',
        'swiper/react': 'Swiper',
        'swiper': 'Swiper',
        'swiper/modules': 'Swiper',
        'lucide-react': 'lucideReact',
      },
    },
  ],
  plugins: [
    peerDepsExternal({
      includeDependencies: false,
    }),
    resolve(),
    commonjs(),
    typescript({
      tsconfig: './tsconfig.json',
      declaration: true,
      declarationDir: 'dist',
    }),
    postcss({
      extract: true,
      minimize: true,
    }),
    process.env.ROLLUP_WATCH && serve({
      open: true,
      contentBase: ['dist', 'assets', '.'],
      port: 3000,
    }),
  ].filter(Boolean),
  external: ['react', 'react-dom'],
};
