module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    ecmaFeatures: { 
      jsx: true 
    },
    project: './tsconfig.json'
  },
  plugins: [
    '@typescript-eslint',
    'react',
    'react-hooks'
  ],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended'
  ],
  rules: {
    'react/react-in-jsx-scope': 'off',
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/no-unused-vars': ['warn', { 
      argsIgnorePattern: '^_',
      varsIgnorePattern: '^_'
    }],
    '@typescript-eslint/no-explicit-any': 'warn',
    'no-console': ['warn', { 
      allow: ['warn', 'error', 'info'] 
    }],
    'prefer-const': 'error',
    'no-var': 'error'
  },
  settings: {
    react: { 
      version: 'detect' 
    }
  },
  env: {
    browser: true,
    node: true,
    es2022: true
  },
  ignorePatterns: [
    'dist',
    'release',
    'node_modules',
    '*.config.js'
  ]
};
