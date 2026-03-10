import { useEffect } from "react";

declare global {
  interface Window {
    google?: any;
    googleTranslateElementInit?: () => void;
  }
}

export const LANGUAGE_OPTIONS = [
  { code: "en", label: "English" },
  { code: "hi", label: "Hindi" },
  { code: "bn", label: "Bengali" },
  { code: "te", label: "Telugu" },
  { code: "mr", label: "Marathi" },
  { code: "ta", label: "Tamil" },
  { code: "ur", label: "Urdu" },
  { code: "gu", label: "Gujarati" },
  { code: "kn", label: "Kannada" },
  { code: "ml", label: "Malayalam" },
  { code: "pa", label: "Punjabi" },
  { code: "or", label: "Odia" },
  { code: "as", label: "Assamese" },
  { code: "mai", label: "Maithili" },
  { code: "sat", label: "Santali" },
  { code: "ks", label: "Kashmiri" },
  { code: "ne", label: "Nepali" },
  { code: "sd", label: "Sindhi" },
  { code: "kok", label: "Konkani" },
  { code: "doi", label: "Dogri" },
  { code: "mni-Mtei", label: "Meitei (Manipuri)" },
  { code: "brx", label: "Bodo" },
  { code: "es", label: "Spanish" },
  { code: "fr", label: "French" },
  { code: "de", label: "German" },
  { code: "ar", label: "Arabic" },
  { code: "zh-CN", label: "Chinese" },
  { code: "ja", label: "Japanese" }
];

const STORAGE_KEY = "siteLanguage";

function setGoogleTranslateCookie(langCode: string) {
  const value = `/en/${langCode}`;
  document.cookie = `googtrans=${value};path=/`;
  document.cookie = `googtrans=${value};path=/;domain=${window.location.hostname}`;
}

export function getSavedLanguage() {
  return localStorage.getItem(STORAGE_KEY) || "en";
}

export function setSiteLanguage(langCode: string) {
  localStorage.setItem(STORAGE_KEY, langCode);
  setGoogleTranslateCookie(langCode);
  window.location.reload();
}

export default function GoogleTranslateBootstrap() {
  useEffect(() => {
    setGoogleTranslateCookie(getSavedLanguage());

    window.googleTranslateElementInit = () => {
      if (!window.google?.translate?.TranslateElement) return;

      new window.google.translate.TranslateElement(
        {
          pageLanguage: "en",
          autoDisplay: false
        },
        "google_translate_element"
      );
    };

    if (!document.getElementById("google-translate-script")) {
      const script = document.createElement("script");
      script.id = "google-translate-script";
      script.src = "https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
      script.async = true;
      document.body.appendChild(script);
    } else if (window.google?.translate?.TranslateElement && window.googleTranslateElementInit) {
      window.googleTranslateElementInit();
    }
  }, []);

  return <div id="google_translate_element" />;
}
