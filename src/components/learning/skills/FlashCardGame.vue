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
import { speak } from '@/services/audio.service'
import { FLASH_CARD_ACTIONS } from '@/engine'
import ProgressStats from '@/components/learning/ProgressStats.vue'

const emit = defineEmits(['completed'])

const store = useLearningStore()

/** Whether the current card is showing its back. */
const isFlipped = ref(false)
/** Set while a TTS fallback notice should show (AMB-12). */
const speechUnavailable = ref(false)

const item = computed(() => store.currentItem)
const progress = computed(() => store.currentProgress)

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

// --- keyboard: Enter / Space flip ------------------------------------------
// Skip when the event target is an interactive control (e.g. a button on the
// card's back face) so Space/Enter keep their native activation behavior.

function onKeydown(event) {
  const tag = event.target?.tagName
  if (tag === 'BUTTON' || tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
    return
  }
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
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
      aria-label="Thẻ nhớ — nhấp để lật"
      @click="flip"
    >
      <!-- 🔊 pinned top-right, works on both faces -->
      <button
        type="button"
        class="btn btn-lg fs-3 fc-speak position-absolute"
        :disabled="speechUnavailable"
        :title="speechUnavailable ? 'Thiết bị không hỗ trợ đọc phát âm' : 'Phát âm'"
        aria-label="Phát âm"
        @click.stop="speakAudio"
      >
        🔊
      </button>

      <div class="fc-card" :class="{ 'is-flipped': isFlipped }" >
        <!-- FRONT -->
        <div class="fc-face fc-front d-flex flex-column justify-content-center align-items-center p-4">
          <span class="badge text-bg-light mb-3">FRONT</span>
          <p class="fc-text display-5 fw-semibold text-center m-0">
            {{ item.payload.front }}
          </p>
          <small class="text-muted mt-4">
            Nhấp / Enter / Space để lật thẻ
          </small>
        </div>

        <!-- BACK -->
        <div class="fc-face fc-back d-flex flex-column justify-content-center p-4">
          <span class="badge text-bg-dark mb-3 align-self-center">BACK</span>

          <p v-if="item.payload.detail.word" class="h4 text-center mb-1">
            {{ item.payload.detail.word }}
          </p>

          <p
            v-if="item.payload.detail.transcription"
            class="text-center text-muted mb-2"
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

.fc-scene {
  width: min(640px, 100%);
  perspective: 1200px;
  cursor: pointer;
  outline: none;
}

.fc-speak {
  top: 0.5rem;
  right: 0.5rem;
  z-index: 5; /* stays above the flipping card, on both faces */
}

.fc-card {
  position: relative;
  width: 100%;
  min-height: min(65dvh, 560px);
  transform-style: preserve-3d;
  transition: transform 0.45s ease;
}

.fc-card.is-flipped {
  transform: rotateY(180deg);
}

.fc-face {
  position: absolute;
  inset: 0;
  border-radius: 0.75rem;
  border: 1px solid var(--bs-border-color);
  background-color: var(--bs-body-bg, #fff);
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.08);
  overflow-y: auto;
}

.fc-back {
  transform: rotateY(180deg);
}

.fc-text {
  overflow-wrap: anywhere;
}
</style>