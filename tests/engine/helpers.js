// Shared fixtures + helpers for engine tests.

export const WORDS = [
  {
    id: 'w1',
    collectionId: 'c1',
    word: 'abandon',
    transcription: '/əˈbændən/',
    meaning: 'bỏ rơi',
    example: 'He abandoned his car.',
    type: 'verb',
    topic: 'Daily',
    level: 'B1',
  },
  {
    id: 'w2',
    collectionId: 'c1',
    word: 'beauty',
    transcription: '/ˈbjuːti/',
    meaning: 'vẻ đẹp',
    example: '',
    type: 'noun',
    topic: 'Daily',
    level: 'A1',
  },
  {
    id: 'w3',
    collectionId: 'c1',
    word: 'cat',
    transcription: '/kæt/',
    meaning: 'con mèo',
    example: 'The cat sleeps.',
    type: 'noun',
    topic: 'Animal',
    level: '',
  },
  {
    id: 'w4',
    collectionId: 'c1',
    word: 'dog',
    transcription: '/dɒɡ/',
    meaning: 'con chó',
    example: '',
    type: '',
    topic: 'Animal',
    level: 'A2',
  },
]

/** Deep copy so tests never mutate the shared fixture. */
export function freshWords() {
  return WORDS.map((w) => ({ ...w }))
}

/**
 * Drive one skill to completion by always answering correctly.
 * @param {Object} session
 * @param {string} skillId
 * @param {(item: Object) => Object} correctAnswerFor  maps item → correct answer
 * @param {{beginSkill, getCurrentItem, submitAnswer, isSkillComplete}} api
 */
export function drainSkill(session, skillId, correctAnswerFor, api) {
  api.beginSkill(session, skillId)

  let guard = 0
  const max = 1000
  while (!api.isSkillComplete(session, skillId)) {
    const item = api.getCurrentItem(session, skillId)
    if (!item) break
    api.submitAnswer(session, skillId, correctAnswerFor(item))
    guard += 1
    if (guard > max) throw new Error('drainSkill: guard limit hit')
  }
}