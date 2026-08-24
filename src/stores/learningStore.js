// Learning store (docs/state-management.md §2.3, business-rules BR-30..75).
//
// NOTE: Skeleton only. No learning engine / Firebase wiring yet, but the
// shapes match the docs exactly so later phases fill in cleanly.

import { defineStore } from 'pinia'

export const MIN_WORDS_TO_STUDY = 4
export const MIN_SKILLS_TO_START = 1

/**
 * @typedef {Object} LearningSession  (populated in Phase 4 by the engine)
 */

export const useLearningStore = defineStore('learning', {
  state: () => ({
    /** @type {string|null} */
    selectedCollectionId: null,
    /** @type {string[]} UUIDs, scoped to selectedCollectionId (BR-34) */
    selectedWordIds: [],
    /** @type {string[]} skill ids (FLASH_CARD, MULTIPLE_CHOICE, LISTENING, TYPING) */
    selectedSkillIds: [],
    /** @type {string|null} */
    activeSkillId: null,
    /** @type {string[]} skills completed in the current session */
    completedSkillIds: [],
    /** @type {LearningSession|null} */
    learningSession: null,
  }),

  getters: {
    selectedWords: (state) => {
      // TODO(Phase 2+): resolve ids to Word objects via wordsStore.
      return state.selectedWordIds
    },

    canProceedToSkills(state) {
      return state.selectedWordIds.length >= MIN_WORDS_TO_STUDY
    },

    canStart(state) {
      return (
        this.canProceedToSkills(state) &&
        state.selectedSkillIds.length >= MIN_SKILLS_TO_START &&
        Boolean(state.selectedCollectionId)
      )
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
    /** @param {string} id */
    selectCollection(id) {
      this.selectedCollectionId = id
      // Changing collection resets per-collection selection (BR-34).
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
      const allSelected = ids.every((id) => this.selectedWordIds.includes(id))
      this.selectedWordIds = allSelected ? [] : ids
    },

    setSelectedSkillIds(ids) {
      this.selectedSkillIds = [...ids]
    },

    toggleSkill(id) {
      const idx = this.selectedSkillIds.indexOf(id)
      if (idx >= 0) this.selectedSkillIds.splice(idx, 1)
      else this.selectedSkillIds.push(id)
    },

    /** @param {string} id */
    setActiveSkill(id) {
      this.activeSkillId = id
    },

    /** @param {string} id */
    markSkillCompleted(id) {
      if (!this.completedSkillIds.includes(id)) this.completedSkillIds.push(id)
    },

    /**
     * Start a learning session. TODO(Phase 4): hand off to learning.service
     * which uses the engine to build the snapshot.
     */
    async startSession() {
      // TODO(Phase 4): learning.service.startSession({...}) → engine snapshot.
      this.learningSession = null
    },

    /** Reset the active skill's progress only (BR-70). */
    exitSkill() {
      this.activeSkillId = null
      if (this.learningSession?.skills?.[this.activeSkillId]) {
        // TODO(Phase 4): clear only active skill queue.
      }
      this.activeSkillId = null
    },

    /** Skill Selection → Word Selection (BR-71). */
    backToWordSelection() {
      this.selectedSkillIds = []
      this.activeSkillId = null
      this.completedSkillIds = []
      this.learningSession = null
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