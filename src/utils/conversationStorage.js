/**
 * 대화 이력 localStorage 저장소
 *
 * 구조: [{ id, title, messages[], updatedAt, messageCount }]
 */

const STORAGE_KEY = 'dcheck_conversations';
const MAX_CONVERSATIONS = 50;

export const conversationStorage = {
  /** 전체 목록 (최신순) */
  list() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const list = raw ? JSON.parse(raw) : [];
      return list.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    } catch {
      return [];
    }
  },

  /** 저장 또는 업데이트 */
  save(conv) {
    const list = this.list();
    const idx = list.findIndex(c => c.id === conv.id);
    if (idx >= 0) {
      list[idx] = conv;
    } else {
      list.unshift(conv);
    }
    // 최대 개수 유지
    if (list.length > MAX_CONVERSATIONS) list.length = MAX_CONVERSATIONS;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    } catch {
      // localStorage 용량 초과 시 오래된 절반 제거 후 재시도
      list.length = Math.floor(MAX_CONVERSATIONS / 2);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    }
  },

  /** 단건 조회 */
  get(id) {
    return this.list().find(c => c.id === id) || null;
  },

  /** 삭제 */
  delete(id) {
    const list = this.list().filter(c => c.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  },

  /** 검색 (제목 + 메시지 내용) */
  search(query) {
    if (!query) return this.list();
    const q = query.toLowerCase();
    return this.list().filter(c =>
      c.title?.toLowerCase().includes(q) ||
      c.messages?.some(m => m.content?.toLowerCase().includes(q))
    );
  },
};
