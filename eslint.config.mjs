import js from '@eslint/js';

/**
 * plugin.js runs inside Super Productivity's plugin host with the
 * `nodeExecution` permission, so unlike a browser-only plugin it genuinely
 * uses CommonJS `require()`/`process` (for file-based IPC with
 * mcp_server.py) alongside `window`/`PluginAPI` from the renderer side.
 */
export default [
  {
    ignores: ['node_modules/**', '*.zip', '__pycache__/**'],
  },
  js.configs.recommended,
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'commonjs',
      globals: {
        // Injected by the Super Productivity plugin host.
        PluginAPI: 'readonly',
        // Browser environment (renderer side).
        window: 'readonly',
        document: 'readonly',
        console: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        // Node environment (nodeExecution permission).
        process: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
      },
    },
    rules: {
      eqeqeq: ['error', 'smart'],
      'no-var': 'error',
      'prefer-const': 'error',
      'no-implicit-globals': 'error',
      'no-throw-literal': 'error',
      curly: ['error', 'multi-line'],
      'no-unused-vars': [
        'error',
        {
          args: 'after-used',
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      // Formatting is Prettier's job, not ESLint's.
    },
  },
];
