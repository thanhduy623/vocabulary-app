// Learning store (docs/state-management.md §2.3, business-rules BR-30..75).
//
// Layering: UI → Store → Service → Engine. The store owns the session
// snapshot and mirrors engine results into UI-facing state
// (activeSkillId / completedSkillIds). All domain rules live in the engine.

import { defineStore } from 'pinia'
import * as engine from '@/engine'
import { createSession } from '@/services/learning.service'
import { useWordsStore } from '@/stores/wordsStore'
import { useCollectionsStore } from '@/stores/collectionsStore'
import { useUiStore } from '@/stores/uiStore'

export const MIN_WORDS_TO_STUDY = 4
export const MIN_SKILLS_TO_START = 1

/**
 * @typedef {Object} LearningSession  engine snapshot — see docs/learning-engine.md §5
 */

export const useLearningStore = defineStore('learning', {
  state: () => ({
    /** @type {string|null} */
    selectedCollectionId: null,
    /** @type {string[]} UUIDs, scoped to selectedCollectionId (BR-34) */
    selectedWordIds: [],
    /** @type {string[]} skill ids selected for this session (BR-33) */
    selectedSkillIds: [],
    /** @type {string|null} skill the learner is currently inside */
    activeSkillId: null,
    /** @type {string[]} skills mastered in the current session (UI mirror) */
    completedSkillIds: [],
    /** @type {LearningSession|null} engine snapshot */
    learningSession: null,
  }),

  getters: {
    canProceedToSkills(state) {
      return state.selectedWordIds.length >= MIN_WORDS_TO_STUDY
    },

    canStart(state) {
      return (
        this.canProceedToSkills &&
        state.selectedSkillIds.length >= MIN_SKILLS_TO_START &&
        Boolean(state.selectedCollectionId)
      )
    },

    /** TTS language from the collection symbol (BR-48). */
    sessionLang(state) {
      if (!state.learningSession) return ''
      return state.learningSession.lang || ''
    },

    /** Current item of the active skill (engine-derived). */
    currentItem(state) {
      if (!state.learningSession || !state.activeSkillId) return null
      return engine.getCurrentItem(state.learningSession, state.activeSkillId)
    },

    /** Progress of the active skill (FR-L10) or null. */
    currentProgress(state) {
      if (!state.learningSession || !state.activeSkillId) return null
      return engine.getProgress(state.learningSession, state.activeSkillId)
    },

    isSkillCompletedNow(state) {
      if (!state.learningSession || !state.activeSkillId) return false
      return engine.isSkillComplete(state.learningSession, state.activeSkillId)
    },

    activeSkillCompleted(state) {
      return state.completedSkillIds.includes(state.activeSkillId)
    },

    isSessionComplete(state) {
      return (
        state.selectedSkillIds.length > 0 &&
        state.selectedSkillIds.every((id) => state.completedSkillIds.includes(id))
      )
    },
  },

  actions: {
    /**
     * Select a collection; changing it resets per-collection study state
     * (BR-30/BR-34).
     * @param {string} id
     */
    selectCollection(id) {
      if (this.selectedCollectionId !== id) {
        this.selectedWordIds = []
        this.selectedSkillIds = []
        this.activeSkillId = null
        this.completedSkillIds = []
        this.learningSession = null
      }
      this.selectedCollectionId = id
    },

    setSelectedWordIds(ids) {
      this.selectedWordIds = [...ids]
    },

    toggleWord(id) {
      const idx = this.selectedWordIds.indexOf(id)
      if (idx >= 0) this.selectedWordIds.splice(idx, 1)
      else this.selectedWordIds.push(id)
    },

    toggleAllWords(words) {
      const ids = words.map((w) => w.id)
      const allSelected =
        ids.length > 0 && ids.every((id) => this.selectedWordIds.includes(id))
      this.selectedWordIds = allSelected ? [] : ids
    },

    toggleSkill(id) {
      const idx = this.selectedSkillIds.indexOf(id)
      if (idx >= 0) this.selectedSkillIds.splice(idx, 1)
      else this.selectedSkillIds.push(id)
    },

    /** Single-selection helper: only one skill is studied per session. */
    setSelectedSkillIds(ids) {
      this.selectedSkillIds = [...ids].slice(0, 1)
    },

    setActiveSkill(id) {
      this.activeSkillId = id
    },

    markSkillCompleted(id) {
      if (!this.completedSkillIds.includes(id)) this.completedSkillIds.push(id)
    },

    /**
     * Start a learning session from the current selection (FR-L05/BR-35).
     * Snapshots words from cache, builds the engine session, activates the
     * first selected skill.
     */
    startSession() {
      if (!this.canStart) {
        return { ok: false, error: 'Chưa đủ điều kiện bắt đầu phiên học' }
      }

      const wordsStore = useWordsStore()
      const collectionsStore = useCollectionsStore()

      // Independent word snapshot (docs/learning-engine.md §10).
      const words = wordsStore
        .wordsOf(this.selectedCollectionId)
        .filter((w) => this.selectedWordIds.includes(w.id))
        .map((w) => ({ ...w }))

      const collection = collectionsStore.getById(this.selectedCollectionId)

      try {
        const { session, firstSkillId } = createSession({
          collectionId: this.selectedCollectionId,
          words,
          skillIds: [...this.selectedSkillIds],
          lang: collection?.symbol ?? '',
        })
        this.learningSession = session
        this.activeSkillId = firstSkillId
        return { ok: true, skillId: firstSkillId }
      } catch (error) {
        useUiStore().pushToast('danger', error.message || 'Không thể bắt đầu phiên học')
        return { ok: false, error: error.message }
      }
    },

    /**
     * Enter (or resume) a skill of the running session.
     * - pending  → begins it
     * - active   → resumes at the same position
     * - completed→ process is NOT remembered: the plan regenerates fresh
     * @param {string} skillId
     */
    enterSkill(skillId) {
      if (!this.learningSession) return false
      if (!this.learningSession.selectedSkillOrder.includes(skillId)) return false

      const plan = this.learningSession.skills[skillId]
      if (plan.status === 'completed') {
        engine.resetSkill(this.learningSession, skillId)
      }
      engine.beginSkill(this.learningSession, skillId)
      this.activeSkillId = skillId
      return true
    },

    /**
     * Start the TYPING skill with a chosen practice mode. The mode decides the
     * question direction (what the learner types): 'word' or 'transcription'.
     * The TYPING plan is regenerated for that mode (fresh shuffle, zeroed
     * counters) and becomes active immediately.
     * @param {'word'|'transcription'} mode
     */
    startTypingMode(mode) {
      if (!this.learningSession) return false
      if (!this.learningSession.selectedSkillOrder.includes(engine.SKILL_IDS.TYPING)) {
        return false
      }
      engine.resetSkill(this.learningSession, engine.SKILL_IDS.TYPING, { mode })
      engine.beginSkill(this.learningSession, engine.SKILL_IDS.TYPING)
      this.activeSkillId = engine.SKILL_IDS.TYPING
      return true
    },

    /**
     * Submit an answer for the active skill's current item and mirror the
     * completion into completedSkillIds (BR-63).
     * @param {Object} answer
     */
    answerActive(answer) {
      if (!this.learningSession || !this.activeSkillId) return null
      const result = engine.submitAnswer(
        this.learningSession,
        this.activeSkillId,
        answer,
      )
      if (result.skillCompleted) {
        this.markSkillCompleted(this.activeSkillId)
      }
      return result
    },

    /** Browse next card without resolving it (flash-card Tiếp theo). */
    browseNext() {
      if (!this.learningSession || !this.activeSkillId) return null
      return engine.skipToNextItem(this.learningSession, this.activeSkillId)
    },

    /** Browse back to the previously browsed card (Lùi lại). */
    browsePrevious() {
      if (!this.learningSession || !this.activeSkillId) return null
      return engine.backToPreviousItem(this.learningSession, this.activeSkillId)
    },

    /**
     * Learning → Skill Selection (exit OR completion). The learner intends to
     * pick the next skill, so the whole session + its progress are discarded —
     * Skill Selection returns to a fresh picker (no progress bars, every skill
     * freely selectable again).
     * Kept:    selectedCollectionId, selectedWordIds (restart or adjust words)
     * Cleared: selectedSkillIds, activeSkillId, completedSkillIds, learningSession
     */
    clearLearningSession() {
      this.selectedSkillIds = []
      this.activeSkillId = null
      this.completedSkillIds = []
      this.learningSession = null
    },

    /** Skill Selection → Word Selection (BR-71): same session reset. */
    backToWordSelection() {
      this.clearLearningSession()
    },

    /** Word Selection → Home (BR-72): reset whole learning context. */
    resetLearningContext() {
      this.selectedCollectionId = null
      this.selectedWordIds = []
      this.selectedSkillIds = []
      this.activeSkillId = null
      this.completedSkillIds = []
      this.learningSession = null
    },
  },
})