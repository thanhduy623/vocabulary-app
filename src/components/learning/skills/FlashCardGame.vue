<script setup>
// FLASH_CARD game (FR-L06, BR-40..43, requirement §2.4.1).
//
// UI responsibilities only — all domain logic (generation, queue, retry
// re-insertion, progress, completion) lives in the engine via learningStore:
//   - click / Enter / Space → flip card (must flip before acting, BR-41)
//   - Tiếp theo / Lùi lại   → browse cards without resolving them
//   - Đã nhớ                → card completed (leaves the queue)
//   - Học lại               → card re-queued randomly later (not completed)
// Skill is finished only when every card is mastered (BR-43).

import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { useLearningStore } from '@/stores/learningStore'
import { speak } from '@/services/speech'
import { FLASH_CARD_ACTIONS } from '@/engine'
import ProgressStats from '@/components/learning/ProgressStats.vue'
import AudioPlayButton from '@/components/learning/AudioPlayButton.vue'

const emit = defineEmits(['completed'])

const store = useLearningStore()

/** Whether the current card is showing its back. */
const isFlipped = ref(false)
/** Set while a TTS fallback notice should show (AMB-12). */
const speechUnavailable = ref(false)

const item = computed(() => store.currentItem)
const progress = computed(() => store.currentProgress)

/**
 * Which front the current card shows — the option mix is randomized, so
 * every card must state its own type (FR-L04b / "indicate question type").
 */
const FRONT_LABELS = {
  'card-front-word': 'Từ',
  'card-front-transcription': 'Phiên âm',
  'card-front-meaning': 'Nghĩa',
}
const frontLabel = computed(() => FRONT_LABELS[item.value?.template] ?? 'Từ')

// Reset the flip state whenever the current card changes.
watch(
  () => item.value?.id,
  () => {
    isFlipped.value = false
  },
)

function flip() {
  if (!item.value) return
  isFlipped.value = !isFlipped.value
  // Auto-play pronunciation when the back face is revealed.
  if (isFlipped.value) speakAudio()
}

function remember() {
  if (!item.value) return
  const result = store.answerActive({ value: FLASH_CARD_ACTIONS.REMEMBERED })
  isFlipped.value = false
  if (result?.skillCompleted) emit('completed')
}

function studyAgain() {
  if (!item.value) return
  store.answerActive({ value: FLASH_CARD_ACTIONS.RETRY })
  isFlipped.value = false
}

function speakAudio() {
  if (!item.value) return
  const res = speak(item.value.payload.audioText, store.sessionLang)
  speechUnavailable.value = !res.ok
}

// --- keyboard: Enter / Space -----------------------------------------------
// Front face → flip to the back. Back face → advance to the next card and
// mark it learned (exactly like "Đã nhớ"). Advances only when the card is
// already revealed; it never skips a card while the front is showing.
function onKeydown(event) {
  if (event.key !== 'Enter' && event.key !== ' ') return
  // Don't hijack keys pressed on other interactive controls (speaker /
  // action buttons) — Space on 🔊 must not ALSO flip the card (§10).
  const target = event.target
  if (
    target instanceof Element &&
    target.closest('button, a, input, select, textarea')
  ) {
    return
  }
  event.preventDefault()
  if (!item.value) return
  if (isFlipped.value) {
    remember()
  } else {
    flip()
  }
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))

// Notify parent immediately when this skill is already finished.
if (store.isSkillCompletedNow) emit('completed')
</script>

<template>
  <div class="flash-card-game">
    <ProgressStats v-if="progress" :progress="progress" />

    <!-- Card (click to flip) -->
    <div
      v-if="item"
      class="fc-scene mx-auto my-1"
      role="button"
      tabindex="0"
      :aria-label="isFlipped ? 'Thẻ nhớ — nhấp để xem tiếp' : 'Thẻ nhớ — nhấp để lật'"
      @click="flip"
    >
      <!-- 🔊 shared AudioPlayButton (§7.1), pinned top-right on both faces.
           Parent owns speak(); the component stops click propagation so the
           card underneath doesn't flip. -->
      <AudioPlayButton
        class="fc-speak position-absolute"
        variant="icon"
        aria-label="Phát âm"
        :unavailable="speechUnavailable"
        @play="speakAudio"
      />

      <div class="fc-card" :class="{ 'is-flipped': isFlipped }" >
        <!-- FRONT -->
        <div class="fc-face fc-front d-flex flex-column justify-content-center align-items-center p-4">
          <span class="badge text-bg-light mb-3">Mặt trước: {{ frontLabel }}</span>
          <p class="fc-text display-5 fw-semibold text-center m-0">
            {{ item.payload.front }}
          </p>
          <small class="text-muted mt-4">
            Nhấp hoặc Enter / Space để lật thẻ
          </small>
        </div>

        <!-- BACK -->
        <div class="fc-face fc-back d-flex flex-column justify-content-center p-4">
          <span class="badge text-bg-light mb-3 align-self-center">Mặt sau</span>

          <p v-if="item.payload.detail.word" class="display-5 fw-semibold text-center mb-1">
            {{ item.payload.detail.word }}
          </p>

          <p
            v-if="item.payload.detail.transcription"
            class="text-center text-muted fc-mono mb-2"
          >
            {{ item.payload.detail.transcription }}
          </p>
          <p v-if="speechUnavailable" class="text-center small text-warning mb-2">
            Thiết bị không hỗ trợ đọc phát âm.
          </p>

          <p class="fs-5 text-center mb-3">{{ item.payload.detail.meaning }}</p>

          <p
            v-if="item.payload.detail.example"
            class="text-center fst-italic text-muted mb-3"
          >
            “{{ item.payload.detail.example }}”
          </p>

          <div class="text-center mb-3">
            <span v-if="item.payload.detail.type" class="badge text-bg-light me-1">
              {{ item.payload.detail.type }}
            </span>
            <span v-if="item.payload.detail.topic" class="badge text-bg-light me-1">
              {{ item.payload.detail.topic }}
            </span>
            <span v-if="item.payload.detail.level" class="badge text-bg-secondary">
              {{ item.payload.detail.level }}
            </span>
          </div>

          <!-- Actions pinned to the BACK face only (requirement §2.4.1) -->
          <div class="fc-actions d-flex justify-content-center gap-3 mt-auto pt-2">
            <button
              type="button"
              class="btn btn-success px-4"
              @click.stop="remember"
            >
              ✓ Đã nhớ
            </button>
            <button
              type="button"
              class="btn btn-outline-warning px-4"
              @click.stop="studyAgain"
            >
              ↺ Học lại
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ---------------------------------------------------------------
   Scene: centered focus column (§5.3, width min(640px, 100%)).
   Focus indicator is an explicit brand ring — never bare
   outline: none (§10).
   --------------------------------------------------------------- */
.fc-scene {
  width: min(640px, 100%);
  perspective: 1200px;
  cursor: pointer;
  outline: none;
  border-radius: 0.9rem;
}

.fc-scene:focus-visible {
  box-shadow: 0 0 0 3px rgba(var(--app-brand-rgb), 0.35);
}

/* Shared AudioPlayButton (§7.1): only the corner position lives here —
   geometry, hover and disabled styling belong to the component. */
.fc-speak {
  top: 0.5rem;
  right: 0.5rem;
  z-index: 5; /* stays above the flipping card, on both faces */
}

.fc-card {
  position: relative;
  width: 100%;
  min-height: min(60dvh, 560px);
  transform-style: preserve-3d;
  transition: transform 0.45s ease;
}

.fc-card.is-flipped {
  transform: rotateY(180deg);
}

/* Faces: token-only surface + hairline border + rest shadow (§3.3). */
.fc-face {
  position: absolute;
  inset: 0;
  border-radius: 0.9rem;
  border: 1px solid var(--app-border);
  background-color: var(--app-surface);
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.08);
  overflow-y: auto;
}

/* Front: subtle brand tint — same "alive" card language as
   CollectionCard's hero (P7), still flat and quiet. */
.fc-front {
  background: linear-gradient(
    135deg,
    rgba(var(--app-brand-rgb), 0.07),
    var(--app-surface) 55%
  );
}

.fc-back {
  transform: rotateY(180deg);
  /* Safe-area padding so the action buttons stay above mobile browser bars. */
  padding-bottom: max(1.5rem, calc(0.75rem + env(safe-area-inset-bottom)));
}

/* Transcription reads as data — system monospace (§3.2, same as word lists). */
.fc-mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas,
    'Liberation Mono', monospace;
}

/* Actions wrap on narrow portrait screens so both buttons stay tappable;
   equal min-width keeps the pair balanced. */
.fc-actions {
  flex-wrap: wrap;
}

.fc-actions .btn {
  min-width: 8.5rem;
}

.fc-text {
  overflow-wrap: anywhere;
}

/* P10 / §8.4 — reduced motion: the flip becomes an instant face swap
   (function preserved, no rotation animation). */
@media (prefers-reduced-motion: reduce) {
  .fc-card {
    transition: none;
  }
}
</style>