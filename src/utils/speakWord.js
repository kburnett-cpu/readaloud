/**
 * TTS fallback: speaks a single word via the browser's SpeechSynthesis API.
 *
 * Used only when the current page has no MP3 file yet. Once all stories have
 * ElevenLabs audio, this module can be deleted — BookReader's onWordTap will
 * always hit the MP3-clip path and never reach this fallback.
 */
export default function speakWord(word, { rate = 0.8, lang = "en-US" } = {}) {
  if (!word || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel(); // clear any queued speech before speaking
  const u = new SpeechSynthesisUtterance(word);
  u.rate = rate;
  u.lang = lang;
  window.speechSynthesis.speak(u);
}
