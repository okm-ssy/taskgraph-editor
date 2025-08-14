/**
 * 環境設定定数
 */

/**
 * デプロイ環境でのreadonly モード設定
 * 環境変数 VITE_READONLY_MODE が 'true' の場合、readonly モードが有効になる
 * デフォルトは false (編集可能)
 */
export const IS_READONLY_MODE = import.meta.env.VITE_READONLY_MODE === 'true';

/**
 * 開発環境かどうかの判定
 */
export const IS_DEVELOPMENT = import.meta.env.DEV;

/**
 * 本番環境かどうかの判定
 */
export const IS_PRODUCTION = import.meta.env.PROD;
