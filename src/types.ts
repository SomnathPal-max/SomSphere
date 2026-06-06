export type Assignment = {
  id: string | number;
  title: string;
  description?: string;
  subject: string;
  dueDate: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  status: 'TODO' | 'IN_PROGRESS' | 'DONE';
};

export type TimetableSlot = {
  id: string | number;
  subject: string;
  room: string;
  day: string;
  startTime: string;
  endTime: string;
  colorTag: string;
};

export type Exam = {
  id: string | number;
  subject: string;
  examDateTime: string;
  type: 'MIDTERM' | 'FINAL' | 'QUIZ';
  notes: string;
};

export type Course = {
  id: string | number;
  name: string;
  creditHours: number;
  grade: string;
};

export type Note = {
  id: string | number;
  title: string;
  content: string;
  createdAt: string;
  category?: 'Work' | 'Study' | 'Personal';
  tags?: string[];
};

export type Habit = {
  id: string | number;
  name: string;
  targetGoal?: number;
};

export type HabitLog = {
  id: string | number;
  habitId: string | number;
  date: string;
  completed: boolean;
};

export type Expense = {
  id: string | number;
  amount: number;
  category: string;
  date: string;
  description: string;
};

export type Announcement = {
  id: string | number;
  title: string;
  body: string;
  category: string;
  postedAt: string;
  pinned: boolean;
};

export type FlashcardDeck = {
  id: string | number;
  title: string;
  cards: { term: string; definition: string }[];
};

export type MatchData = {
  [key: string]: any;
};
