import { collection, doc, setDoc, getDocs, query, where, orderBy, limit } from 'firebase/firestore'
import { db } from './firebase'
import type { AdvisorConversation } from '@/types'

const CONVERSATION_KEY = 'cropoctor_advisor_conversations'

class AdvisorService {
  /**
   * Save an AI Advisor conversation to Firestore (or localStorage for guests).
   */
  async saveConversation(conversation: AdvisorConversation): Promise<void> {
    try {
      if (conversation.userId) {
        // Authenticated user: save to Firestore subcollection (avoids need for composite indexes)
        const docRef = doc(db, 'users', conversation.userId, 'advisorConversations', conversation.id)
        await setDoc(docRef, conversation)
      } else {
        // Guest user: save to localStorage
        const stored = localStorage.getItem(CONVERSATION_KEY)
        let conversations: AdvisorConversation[] = stored ? JSON.parse(stored) : []
        
        const existingIdx = conversations.findIndex(c => c.id === conversation.id)
        if (existingIdx >= 0) {
          conversations[existingIdx] = conversation
        } else {
          conversations.push(conversation)
        }
        
        localStorage.setItem(CONVERSATION_KEY, JSON.stringify(conversations))
      }
    } catch (err) {
      console.error('[AdvisorService] Failed to save conversation:', err)
      throw err
    }
  }

  /**
   * Get recent conversations for a specific farm.
   */
  async getRecentConversations(limitCount: number = 20, farmId?: string, userId?: string): Promise<AdvisorConversation[]> {
    try {
      if (userId) {
        // Fetch from Firestore subcollection
        let q = query(
          collection(db, 'users', userId, 'advisorConversations'),
          orderBy('updatedAt', 'desc'),
          limit(limitCount)
        )
        const snap = await getDocs(q)
        let conversations = snap.docs.map(doc => doc.data() as AdvisorConversation)
        
        if (farmId) {
          conversations = conversations.filter(c => c.farmId === farmId)
        }
        return conversations
      } else {
        // Fetch from localStorage for guest
        const stored = localStorage.getItem(CONVERSATION_KEY)
        if (!stored) return []
        let conversations: AdvisorConversation[] = JSON.parse(stored)
        
        if (farmId) {
          conversations = conversations.filter(c => c.farmId === farmId)
        }
        
        // Sort descending by updatedAt
        conversations.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        
        return conversations.slice(0, limitCount)
      }
    } catch (err) {
      console.error('[AdvisorService] Failed to fetch conversations:', err)
      return []
    }
  }
}

export const advisorService = new AdvisorService()
