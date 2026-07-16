import { Assessment } from '../types';

export const INITIAL_ASSESSMENTS: Assessment[] = [
  {
    assessmentId: 'assess-1',
    title: 'Algorithms & Data Structures Challenge',
    description: 'Evaluate fundamental problem-solving abilities, including array manipulation, search optimization, and dynamic coding logic.',
    timeLimit: 45,
    createdBy: 'admin-1',
    createdAt: new Date(Date.now() - 3600000 * 24 * 3).toISOString(), // 3 days ago
    questions: [
      {
        id: 'q1_1',
        type: 'multiple-choice',
        points: 10,
        questionText: 'What is the worst-case time complexity of finding an element in a binary search tree (BST) of size N?',
        options: [
          'O(1)',
          'O(log N)',
          'O(N)',
          'O(N log N)'
        ],
        correctOptionIndex: 2 // O(N) when unbalanced
      },
      {
        id: 'q1_2',
        type: 'coding',
        points: 40,
        questionText: 'Write a JavaScript function "twoSum(nums, target)" that returns indices of the two numbers such that they add up to target. You may assume that each input would have exactly one solution, and you may not use the same element twice.',
        starterCode: `function twoSum(nums, target) {
  // Write your code here
  const map = {};
  for (let i = 0; i < nums.length; i++) {
    const complement = target - nums[i];
    if (complement in map) {
      return [map[complement], i];
    }
    map[nums[i]] = i;
  }
  return [];
}`,
        testCases: [
          { input: '[2, 7, 11, 15], 9', expectedOutput: '[0, 1]' },
          { input: '[3, 2, 4], 6', expectedOutput: '[1, 2]' },
          { input: '[3, 3], 6', expectedOutput: '[0, 1]' }
        ]
      },
      {
        id: 'q1_3',
        type: 'multiple-choice',
        points: 10,
        questionText: 'Which data structure uses the LIFO (Last In First Out) property?',
        options: [
          'Queue',
          'Stack',
          'Heap',
          'Linked List'
        ],
        correctOptionIndex: 1
      }
    ]
  },
  {
    assessmentId: 'assess-2',
    title: 'Full-Stack JavaScript & Web Core',
    description: 'Assess standard web technologies, asynchronous execution flow, and advanced array manipulation methods.',
    timeLimit: 30,
    createdBy: 'admin-1',
    createdAt: new Date(Date.now() - 3600000 * 24 * 5).toISOString(), // 5 days ago
    questions: [
      {
        id: 'q2_1',
        type: 'multiple-choice',
        points: 15,
        questionText: 'Which of the following is true about "Promise.all" vs "Promise.allSettled" in JavaScript?',
        options: [
          'Promise.all rejects immediately if any promise rejects, while Promise.allSettled waits for all to settle regardless of outcome.',
          'Promise.allSettled rejects immediately if any promise rejects, while Promise.all waits.',
          'Both reject immediately on any failure.',
          'Promise.all returns settled states, while Promise.allSettled only returns resolved values.'
        ],
        correctOptionIndex: 0
      },
      {
        id: 'q2_2',
        type: 'coding',
        points: 35,
        questionText: 'Write a JavaScript function "reverseWords(str)" that reverses the order of words in a sentence, while maintaining single space separation. Do not use built-in array utilities like .reverse().',
        starterCode: `function reverseWords(str) {
  // Write your code here
  const words = str.split(' ').filter(Boolean);
  let result = '';
  for (let i = words.length - 1; i >= 0; i--) {
    result += words[i] + (i > 0 ? ' ' : '');
  }
  return result;
}`,
        testCases: [
          { input: '"hello world"', expectedOutput: '"world hello"' },
          { input: '"IntegrityIQ is awesome"', expectedOutput: '"awesome is IntegrityIQ"' }
        ]
      }
    ]
  }
];
