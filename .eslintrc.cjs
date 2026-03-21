module.exports = {
  root: true,
  env: { browser: true, es2020: true },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended-type-checked',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'plugin:react/jsx-runtime',
  ],
  ignorePatterns: ['dist', '.eslintrc.cjs', 'supabase/'],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    project: ['./tsconfig.json', './tsconfig.node.json'],
    tsconfigRootDir: __dirname,
  },
  plugins: ['react-refresh'],
  rules: {
    'react-refresh/only-export-components': [
      'warn',
      { allowConstantExport: true },
    ],
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    'react/prop-types': 'off',
    // Async functions passed to JSX event handlers (onClick, etc.) is the standard
    // React pattern. Only enforce the void-return check in non-attribute contexts.
    '@typescript-eslint/no-misused-promises': [
      'error',
      { checksVoidReturn: { attributes: false } },
    ],
  },
  settings: {
    react: {
      version: 'detect',
    },
  },
  overrides: [
    {
      // React Three Fiber JSX uses non-standard HTML props (position, args, etc.)
      files: [
        'src/components/viewer-3d/*.tsx',
        'src/components/equipment/Equipment3DPreview.tsx',
      ],
      rules: {
        'react/no-unknown-property': 'off',
      },
    },
    {
      // Supabase JS client returns loosely-typed data; service files already
      // cast at the return boundary so unsafe-assignment warnings are spurious.
      // Same applies to chat service which wraps supabase.functions.invoke.
      files: ['src/lib/supabase/*.ts', 'src/lib/chat/*.ts'],
      rules: {
        '@typescript-eslint/no-unsafe-assignment': 'off',
        '@typescript-eslint/no-unsafe-return': 'off',
        '@typescript-eslint/no-unsafe-member-access': 'off',
        '@typescript-eslint/no-unsafe-call': 'off',
      },
    },
  ],
}
