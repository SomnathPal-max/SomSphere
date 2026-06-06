export interface UniversityEvent {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  type: 'HOLIDAY' | 'EXAM_PERIOD';
}

export const fetchUniversityEvents = async (): Promise<UniversityEvent[]> => {
  // Mock fetching events
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve([
        {
          id: '1',
          title: 'Spring Break',
          date: new Date().toISOString().split('T')[0], // Make it today so it shows up for testing
          type: 'HOLIDAY'
        },
        {
          id: '2',
          title: 'Midterm Prep',
          date: new Date(Date.now() + 86400000).toISOString().split('T')[0], // Tomorrow
          type: 'EXAM_PERIOD'
        }
      ]);
    }, 600);
  });
};
