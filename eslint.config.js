import js from '@eslint/js';
import globals from 'globals';

/** Globais do catálogo Claw'd (injetados via content_scripts / importScripts). */
const clawdCatalogGlobals = {
  CLAWD_SCHEMA_VERSION: 'readonly',
  CLAWD_DAILY_QUESTS: 'readonly',
  CLAWD_WEEKLY_CHALLENGES: 'readonly',
  CLAWD_RARITY: 'readonly',
  CLAWD_ACCESSORIES: 'readonly',
  CLAWD_MODELS: 'readonly',
  CLAWD_FACES: 'readonly',
  CLAWD_FACE_STYLES: 'readonly',
  CLAWD_SKINS: 'readonly',
  CLAWD_ACTIONS: 'readonly',
  CLAWD_PET_EXTRA_ACTIONS: 'readonly',
  CLAWD_PROFESSIONS: 'readonly',
  CLAWD_SUBPETS: 'readonly',
  CLAWD_SUBPET_SPRITES: 'readonly',
  CLAWD_SUBPET_CELL: 'readonly',
  CLAWD_SUBPET_ACTIONS: 'readonly',
  CLAWD_IDLE_VARIATIONS: 'readonly',
  CLAWD_KEYBOARD_SHORTCUTS: 'readonly',
  CLAWD_PAGE_CONTEXTS: 'readonly',
  CLAWD_CONTEXT_REACTIONS: 'readonly',
  CLAWD_DOM_CLEANUP_SELECTORS: 'readonly',
  CLAWD_RUNTIME_ACTIONS: 'readonly',
  CLAWD_PORT_MSG_TYPES: 'readonly',
  CLAWD_DOWNSTREAM_PORT_MSG_TYPES: 'readonly',
  CLAWD_TRAVEL_FREQS: 'readonly',
  CLAWD_START_CORNERS: 'readonly',
  CLAWD_STUDIO_CORNERS: 'readonly',
  CLAWD_NAME_TAG_THEMES: 'readonly',
  CLAWD_TAG_THEMES: 'readonly',
  CLAWD_SETTING_KEYS: 'readonly',
  CLAWD_CONFIG_KEYS: 'readonly',
  CLAWD_TIMINGS: 'readonly',
  CLAWD_ACHIEVEMENTS: 'readonly',
  CLAWD_SHOP: 'readonly',
  CLAWD_COLORS: 'readonly',
  CLAWD_COLOR_PRESETS: 'readonly',
  CLAWD_JERSEYS: 'readonly',
  CLAWD_POPUP_TABS: 'readonly',
  clawdDefaultState: 'readonly',
  clawdMigrateState: 'readonly',
  clawdSanitizePlainText: 'readonly',
  clawdSanitizeHostname: 'readonly',
  clawdSanitizeConfigValue: 'readonly',
  clawdSanitizeSettingValue: 'readonly',
  clawdIsHexColor: 'readonly',
  clawdAssignPlain: 'readonly',
  clawdPlainMerge: 'readonly',
  clawdValidateRuntimeMessage: 'readonly',
  clawdValidatePortMessage: 'readonly',
  clawdValidateDownstreamPortMessage: 'readonly',
  clawdHasExtensionContext: 'readonly',
  clawdIsExtensionContextError: 'readonly',
  clawdSafeExtensionCall: 'readonly',
  clawdGuardExtensionCallback: 'readonly',
  clawdLevelFromXp: 'readonly',
  clawdXpForLevel: 'readonly',
  clawdTitleForLevel: 'readonly',
  clawdISOWeek: 'readonly',
  clawdDailyQuestForDate: 'readonly',
  clawdWeeklyChallengeForWeek: 'readonly',
  clawdEnsureWeeklyChallenge: 'readonly',
  clawdEnsureDailyQuest: 'readonly',
  clawdRegisterDailyProgress: 'readonly',
  clawdRegisterWeeklyProgress: 'readonly',
  clawdEffectiveAccessories: 'readonly',
  clawdHostIsBlocked: 'readonly',
  clawdHostMatchesDomain: 'readonly',
  clawdSubPetImageUrl: 'readonly',
  clawdSubPetBounds: 'readonly',
  clawdSubPetFrame: 'readonly',
  clawdSubPetPalette: 'readonly',
  clawdBuildPixelShadow: 'readonly',
  clawdMergeUnlockedSubpets: 'readonly',
  clawdPageContextFromHost: 'readonly'
};

export default [
  {
    ignores: ['docs/', 'tests/tools/', 'tests/shots/', 'tests/sprite-out/', 'tests/**/*.mjs', 'node_modules/']
  },
  js.configs.recommended,
  {
    files: ['src/content/**/*.js', 'src/popup/**/*.js', 'src/background/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'script',
      globals: {
        ...globals.browser,
        ...globals.webextensions,
        ...globals.serviceworker,
        chrome: 'readonly',
        importScripts: 'readonly',
        ...clawdCatalogGlobals
      }
    },
    rules: {
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
      'no-script-url': 'error',
      'no-caller': 'error',
      'no-extend-native': 'warn',
      'no-global-assign': 'error',
      'no-labels': 'error',
      'no-proto': 'error',
      'no-with': 'error',
      'no-void': 'off',
      'no-empty': ['error', { allowEmptyCatch: true }],
      'no-control-regex': 'off',
      'eqeqeq': ['warn', 'smart'],
      'no-case-declarations': 'warn',
      'no-unused-vars': ['warn', { args: 'none', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' }],
      'no-redeclare': 'error',
      'no-shadow-restricted-names': 'error',
      'no-use-before-define': ['warn', { functions: false, classes: false }]
    }
  },
  {
    /* catalog.js DEFINE os globais — não tratar como redeclarar built-ins */
    files: ['src/shared/catalog.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'script',
      globals: {
        ...globals.browser,
        ...globals.webextensions,
        module: 'readonly',
        exports: 'readonly'
      }
    },
    rules: {
      'no-redeclare': 'off',
      'no-void': 'off',
      'no-empty': ['error', { allowEmptyCatch: true }],
      'no-control-regex': 'off',
      'no-unused-vars': ['warn', { args: 'none', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' }]
    }
  },
  {
    files: ['tests/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'script',
      globals: {
        ...globals.node,
        ...globals.browser,
        ...clawdCatalogGlobals
      }
    },
    rules: {
      'no-redeclare': 'off',
      'no-void': 'off',
      'no-empty': ['error', { allowEmptyCatch: true }],
      'no-control-regex': 'off',
      'no-unused-vars': ['warn', { args: 'none', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' }]
    }
  }
];
