/**
 * Centralized font manager for AJKMart.
 *
 * Strategy:
 *   • Core Inter fonts are always loaded at startup — they are small (~300 KB
 *     total) and required for every screen in the app.
 *   • Noto Nastaliq Urdu fonts (~2.7 MB) are loaded ONLY when the active
 *     language is "ur" or "en_ur".  This prevents the FontFaceObserver
 *     timeout error that appeared on every cold start for English users.
 *
 * Usage:
 *   import { loadCoreFonts, loadUrduFonts, urduFontsReady } from "@/utils/fonts";
 */
import * as Font from "expo-font";
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import {
  NotoNastaliqUrdu_400Regular,
  NotoNastaliqUrdu_500Medium,
  NotoNastaliqUrdu_600SemiBold,
  NotoNastaliqUrdu_700Bold,
} from "@expo-google-fonts/noto-nastaliq-urdu";

const CORE_FONTS = {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
};

const URDU_FONTS = {
  NotoNastaliqUrdu_400Regular,
  NotoNastaliqUrdu_500Medium,
  NotoNastaliqUrdu_600SemiBold,
  NotoNastaliqUrdu_700Bold,
};

let _urduLoaded = false;
let _urduLoading: Promise<void> | null = null;

/** Returns true if Urdu fonts have already been loaded into the font registry. */
export function urduFontsReady(): boolean {
  return _urduLoaded;
}

/**
 * Load the four Inter weights that the app uses everywhere.
 * Throws if loading fails — caller should handle / ignore.
 */
export async function loadCoreFonts(): Promise<void> {
  await Font.loadAsync(CORE_FONTS);
}

/**
 * Load the four Noto Nastaliq Urdu weights.
 * Safe to call multiple times — subsequent calls are no-ops.
 * Never throws; errors are silently swallowed.
 */
export async function loadUrduFonts(): Promise<void> {
  if (_urduLoaded) return;

  if (_urduLoading) {
    await _urduLoading.catch(() => {});
    return;
  }

  _urduLoading = Font.loadAsync(URDU_FONTS).then(() => {
    _urduLoaded = true;
  }).catch(() => {
    _urduLoading = null;
  });

  await _urduLoading;
}
