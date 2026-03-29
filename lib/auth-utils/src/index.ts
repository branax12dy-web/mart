export { executeCaptcha, isRecaptchaLoaded } from "./captcha/index";
export {
  GoogleOAuthProvider,
  useGoogleLogin,
  useFacebookLogin,
  initFacebookSDK,
  type OAuthResult,
  type OAuthError,
} from "./oauth/index";
export { TwoFactorSetup, TwoFactorVerify } from "./two-factor/index";
export type { TwoFactorSetupProps, TwoFactorVerifyProps } from "./two-factor/types";
export { MagicLinkSender } from "./magic-link/index";
export type { MagicLinkSenderProps } from "./magic-link/types";
