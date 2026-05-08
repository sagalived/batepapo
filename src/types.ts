export interface UserProfile {
  uid: string;
  displayName: string;
  photoURL: string;
  bio: string;
  neighborhood: string;
  geohash?: string;
  lat?: number;
  lng?: number;
  createdAt: string;
  updatedAt?: string;
}

export interface MatchInfo {
  id: string;
  users: string[];
  createdAt: string;
  lastMessage?: string;
  lastMessageAt?: string;
}

export interface Message {
  id: string;
  senderId: string;
  text: string;
  createdAt: string;
}

export interface CallSignaling {
  id: string;
  callerId: string;
  receiverId: string;
  offer?: any;
  answer?: any;
  candidates?: any[];
  status: 'calling' | 'ongoing' | 'ended' | 'declined';
}
