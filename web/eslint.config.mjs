import { defineConfig, globalIgnores } from 'eslint/config';
import tseslint from 'typescript-eslint';

const allowedUserCopy = new Set([
  'FORGE',
  'NC CORP',
  'Sreadya',
  'SREADYA',
  'CycleVault',
  'GitHub',
  'WebCrypto',
  'IndexedDB',
  'PIN',
  'UTC',
  'by NC CORP',
  'S',
]);

function isTranslatableLiteral(value) {
  if (typeof value !== 'string') return false;
  const normalized = value.replace(/\s+/g, ' ').trim();
  if (!normalized || allowedUserCopy.has(normalized)) return false;
  if (/^https?:/i.test(normalized) || /^data-/i.test(normalized)) return false;
  if (normalized.includes('Prakritim') && normalized.includes('Avashtabhya.')) return false;
  return /^[A-Za-z]/.test(normalized);
}

const sreadyaI18nPlugin = {
  rules: {
    'no-hardcoded-user-copy': {
      meta: {
        type: 'problem',
        docs: {
          description: 'Require SREADYA user-facing copy to use stable globalization message IDs.',
        },
        schema: [],
        messages: {
          hardcoded: 'User-facing copy must use the SREADYA t(...) message contract.',
        },
      },
      create(context) {
        const filename = context.filename ?? '';
        if (
          /\.test\.tsx?$/.test(filename)
          || filename.endsWith('/src/app/layout.tsx')
          || filename.endsWith('/src/components/vault/VaultLocalOnlyPanel.tsx')
        ) {
          return {};
        }

        const sourceText = context.sourceCode.getText();
        const harnessStart = sourceText.indexOf('/* i18n-test-harness-start */');
        const harnessEnd = sourceText.indexOf('/* i18n-test-harness-end */');
        const insideTestHarness = (node) =>
          harnessStart >= 0
          && harnessEnd > harnessStart
          && Array.isArray(node.range)
          && node.range[0] >= harnessStart
          && node.range[1] <= harnessEnd;

        return {
          JSXText(node) {
            if (insideTestHarness(node)) return;
            if (isTranslatableLiteral(node.value)) {
              context.report({ node, messageId: 'hardcoded' });
            }
          },
          JSXAttribute(node) {
            if (insideTestHarness(node)) return;
            if (!node.name || node.name.type !== 'JSXIdentifier') return;
            const checked = new Set(['aria-label', 'placeholder', 'title', 'alt', 'eyebrow']);
            if (!checked.has(node.name.name)) return;
            if (node.value?.type === 'Literal' && isTranslatableLiteral(node.value.value)) {
              context.report({ node, messageId: 'hardcoded' });
            }
          },
          CallExpression(node) {
            if (insideTestHarness(node)) return;
            if (node.callee?.type !== 'Identifier') return;
            if (!['setError', 'setStatus'].includes(node.callee.name)) return;
            const first = node.arguments?.[0];
            if (first?.type === 'Literal' && isTranslatableLiteral(first.value)) {
              context.report({ node: first, messageId: 'hardcoded' });
            }
          },
        };
      },
    },
  },
};

export default defineConfig([
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx,mts,cts}'],
    plugins: {
      sreadya: sreadyaI18nPlugin,
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      'sreadya/no-hardcoded-user-copy': 'error',
    },
  },
  globalIgnores(['.next/**', 'out/**', 'coverage/**', 'playwright-report/**', 'test-results/**', 'node_modules/**']),
]);
