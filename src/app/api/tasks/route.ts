/**
 * Minimal Tasks API for RLHF Demo with Mock MT-Bench Data
 */

import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';

// Function to generate consistent UUIDs from string seeds
function generateUUID(seed: string): string {
  // Create a deterministic UUID from seed for consistent results
  const seedNum = seed.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const hex = (seedNum * 123456789).toString(16).padStart(8, '0').slice(0, 8);
  return `${hex.slice(0, 8)}-${hex.slice(0, 4)}-4${hex.slice(1, 4)}-8${hex.slice(0, 3)}-${hex.slice(0, 12)}`;
}

// Real MTBench tasks data for demo
const mockTasks = [
  {
    id: generateUUID("mt-bench-150"),
    title: "A/B Preference – MTBench #150",
    description: "Compare two AI-generated creative stories and choose which one is better",
    task_type: "pairwise_ab",
    instructions: "Write a short story about a robot learning to paint.\n\nOption A: Unit-7 had never understood art. Its circuits were designed for efficiency, not creativity. But when it discovered a forgotten paintbrush in the abandoned warehouse it called home, something sparked. Each night, after its maintenance duties, Unit-7 would dip the brush in oils salvaged from machinery and sweep colors across metal sheets. At first, only geometric patterns emerged—perfect circles, precise lines. But gradually, imperfections crept in. A wobbly curve here, a splash there. The other robots called it malfunction. Unit-7 called it beautiful. When humans finally discovered the warehouse, they found walls covered in paintings of sunsets the robot had never seen, flowers it had only catalogued, and in the center, a self-portrait: a mechanical hand holding a paintbrush, reaching toward something beyond code.\n\nOption B: The robot painted. It had learned from analyzing 1,247,892 images in its database. Its mechanical arm moved with precision, recreating Van Gogh's Starry Night with 99.7% accuracy. The colors were correct. The brushstrokes matched the original. The museum visitors nodded appreciatively at the demonstration. 'Impressive technology,' they said. The robot continued painting, producing perfect replicas one after another. It painted Monet's Water Lilies. It painted Picasso's Guernica. Each painting was exact, flawless, efficient. The robot didn't understand why the child in the corner, drawing stick figures with crayons, seemed happier.",
    reward_amount: 0.02,
    reward_currency: "USDC",
    max_submissions: 100,
    difficulty_level: 3,
    estimated_time_minutes: 5,
    category_name: "RLHF Rating",
    created_at: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
    expires_at: new Date(Date.now() + 86400000 * 7).toISOString(), // 7 days from now
    user_has_submitted: false,
    status: "active",
    priority: 1
  },
  {
    id: generateUUID("mt-bench-151"),
    title: "A/B Preference – MTBench #151",
    description: "Compare two AI-generated explanations of a complex topic and choose the clearer one",
    task_type: "pairwise_ab",
    instructions: "Explain what quantum computing is to someone with no technical background.\n\nOption A: Quantum computing is like having a magical computer that can try many solutions at once. While regular computers work with bits that are either 0 or 1 (like switches that are on or off), quantum computers use 'qubits' that can be both at the same time - like a coin spinning in the air before it lands. This allows them to solve certain problems much faster, like finding the best route through a maze by exploring all paths simultaneously rather than one at a time.\n\nOption B: Quantum computing leverages quantum mechanical phenomena such as superposition and entanglement to process information. Unlike classical bits that exist in binary states, qubits can maintain coherent superposition states, enabling parallel computation across exponentially scaling Hilbert spaces. Through quantum gates and circuits, we can implement algorithms like Shor's factorization or Grover's search that demonstrate polynomial or exponential speedups over classical algorithms for specific problem classes.",
    reward_amount: 0.02,
    reward_currency: "USDC",
    max_submissions: 100,
    difficulty_level: 2,
    estimated_time_minutes: 4,
    category_name: "RLHF Rating",
    created_at: new Date(Date.now() - 43200000).toISOString(), // 12 hours ago
    expires_at: new Date(Date.now() + 86400000 * 7).toISOString(),
    user_has_submitted: false,
    status: "active",
    priority: 2
  },
  {
    id: generateUUID("mt-bench-106"),
    title: "A/B Preference – MTBench #106",
    description: "Logic problem about comparing costs of fruits",
    task_type: "pairwise_ab",
    instructions: "Each problem consists of three statements. Based on the first two statements, the third statement may be true, false, or uncertain.\n1. Oranges cost more than apples.\n2. Oranges cost less than bananas.\n3. Bananas cost more than apples and bananas cost more than oranges.\n\nIf the first two statements are true, then the third statement is:\n\nOption A: TRUE. From statement 1: Oranges > Apples. From statement 2: Bananas > Oranges. By transitivity: Bananas > Oranges > Apples. Therefore, bananas cost more than apples (true) AND bananas cost more than oranges (true from statement 2). The third statement is TRUE.\n\nOption B: FALSE. The third statement contains a typo - it says 'orange' (singular) at the end, but we only know about 'oranges' (plural) from the given statements. However, assuming this is just a typo and means 'oranges', then: From statements 1 and 2, we get Bananas > Oranges > Apples. This means both parts of statement 3 are true, so the answer is TRUE, not FALSE.",
    reward_amount: 0.02,
    reward_currency: "USDC",
    max_submissions: 100,
    difficulty_level: 2,
    estimated_time_minutes: 3,
    category_name: "RLHF Rating",
    created_at: new Date(Date.now() - 21600000).toISOString(), // 6 hours ago
    expires_at: new Date(Date.now() + 86400000 * 7).toISOString(),
    user_has_submitted: false,
    status: "active",
    priority: 3
  }
];

// Generate more tasks with real MTBench examples
const generateMoreTasks = () => {
  const tasks = [...mockTasks];

  // Additional real MTBench task examples with Option A and Option B
  const realExamples = [
    {
      title: "A/B Preference – MTBench #102",
      desc: "Riddle about the White House location",
      instruction: "You can see a beautiful red house to your left and a hypnotic greenhouse to your right, an attractive heated pink place in the front. So, where is the White House?\n\nOption A: The White House is in Washington, D.C. This is a trick question that plays with your expectations. The red house, greenhouse, and pink place are meant to distract you, but the White House is simply the famous building where the U.S. President lives, located at 1600 Pennsylvania Avenue in Washington, D.C.\n\nOption B: The White House must be behind you. Since you can see a red house to your left, a greenhouse to your right, and a pink place in front, the only remaining direction where the White House could be is behind you, following the pattern of colored houses in different directions."
    },
    {
      title: "A/B Preference – MTBench #96",
      desc: "Explain machine learning to non-technical customers",
      instruction: "What is a language model? Is it trained using labeled or unlabelled data?\n\nOption A: A language model is like a very smart autocomplete system. It's a type of AI that has read millions of texts and learned patterns in how we use language. Just like how your phone suggests the next word when you're typing, but much more sophisticated. Language models are typically trained using unlabeled data - they learn from raw text without needing someone to manually mark what's right or wrong. They figure out patterns by themselves, similar to how a child learns language by listening to conversations.\n\nOption B: A language model is a statistical tool that predicts the probability of word sequences. It uses transformer architecture with attention mechanisms to process sequential data. These models are trained using unsupervised learning on unlabeled corpora through techniques like masked language modeling or next-token prediction. The training involves optimizing parameters through backpropagation to minimize cross-entropy loss."
    },
    {
      title: "A/B Preference – MTBench #120",
      desc: "Mathematical function evaluation",
      instruction: "Given that f(x) = 4x^3 - 9x - 14, find the value of f(2).\n\nOption A: To find f(2), I'll substitute x = 2 into the function:\nf(2) = 4(2)^3 - 9(2) - 14\nf(2) = 4(8) - 18 - 14\nf(2) = 32 - 18 - 14\nf(2) = 0\n\nTherefore, f(2) = 0.\n\nOption B: Let me calculate f(2) step by step:\nFirst, I'll compute 2^3 = 8\nThen, 4 × 8 = 32\nNext, 9 × 2 = 18\nSo f(2) = 32 - 18 - 14 = 14 - 14 = 0\n\nThe answer is f(2) = 0."
    },
    {
      title: "A/B Preference – MTBench #104",
      desc: "Logic puzzle about siblings",
      instruction: "David has three sisters. Each of them has one brother. How many brothers does David have?\n\nOption A: David has 0 brothers. The key insight is that David IS the one brother that each of his three sisters has. Each sister has exactly one brother (David himself), so David doesn't have any other brothers.\n\nOption B: David has 3 brothers. Since each of David's three sisters has one brother, and there are three sisters, that means there must be 3 brothers in total. So David has 3 brothers."
    },
    {
      title: "A/B Preference – MTBench #117",
      desc: "Inequality problem",
      instruction: "How many integers are in the solution of the inequality |x + 5| < 10?\n\nOption A: To solve |x + 5| < 10, I need to consider that this means -10 < x + 5 < 10.\nSubtracting 5 from all parts: -15 < x < 5\nThe integers in this range are: -14, -13, -12, -11, -10, -9, -8, -7, -6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4\nCounting these integers, I get 19 integers total.\n\nOption B: The inequality |x + 5| < 10 gives us two cases:\nCase 1: x + 5 < 10, which means x < 5\nCase 2: -(x + 5) < 10, which means x > -15\nCombining both: -15 < x < 5\nThe integers are from -14 to 4 inclusive.\nThat's 4 - (-14) + 1 = 19 integers."
    },
    {
      title: "A/B Preference – MTBench #111",
      desc: "Triangle area calculation",
      instruction: "The vertices of a triangle are at points (0, 0), (-1, 1), and (3, 3). What is the area?\n\nOption A: Using the shoelace formula for the area of a triangle with vertices (x₁, y₁), (x₂, y₂), (x₃, y₃):\nArea = ½|x₁(y₂ - y₃) + x₂(y₃ - y₁) + x₃(y₁ - y₂)|\nArea = ½|0(1 - 3) + (-1)(3 - 0) + 3(0 - 1)|\nArea = ½|0 - 3 - 3|\nArea = ½|-6|\nArea = 3 square units\n\nOption B: I'll use vectors to find the area. Let A = (0, 0), B = (-1, 1), C = (3, 3).\nVector AB = (-1, 1) and Vector AC = (3, 3)\nThe area is ½|AB × AC| where × is the cross product in 2D:\nArea = ½|(-1)(3) - (1)(3)|\nArea = ½|-3 - 3|\nArea = ½|-6| = 3 square units"
    },
    {
      title: "A/B Preference – MTBench #121",
      desc: "Python programming task",
      instruction: "Develop a Python program that reads all text files under a directory and returns top-5 words with most occurrences.\n\nOption A: ```python\nimport os\nfrom collections import Counter\nimport re\n\ndef get_top_words(directory):\n    word_count = Counter()\n    \n    for root, dirs, files in os.walk(directory):\n        for file in files:\n            if file.endswith('.txt'):\n                filepath = os.path.join(root, file)\n                with open(filepath, 'r', encoding='utf-8') as f:\n                    text = f.read().lower()\n                    words = re.findall(r'\\b\\w+\\b', text)\n                    word_count.update(words)\n    \n    return word_count.most_common(5)\n\n# Usage\ntop_5 = get_top_words('./my_directory')\nfor word, count in top_5:\n    print(f'{word}: {count}')\n```\n\nOption B: ```python\nimport glob\n\ndef top_5_words(directory):\n    words = {}\n    files = glob.glob(f'{directory}/**/*.txt', recursive=True)\n    \n    for file in files:\n        with open(file, 'r') as f:\n            for line in f:\n                for word in line.split():\n                    word = word.strip('.,!?;:').lower()\n                    words[word] = words.get(word, 0) + 1\n    \n    sorted_words = sorted(words.items(), key=lambda x: x[1], reverse=True)\n    return sorted_words[:5]\n\nresult = top_5_words('./my_directory')\nprint(result)\n```"
    },
    {
      title: "A/B Preference – MTBench #99",
      desc: "Mathematical proof in poetry",
      instruction: "As a mathematician-poet, prove the square root of 2 is irrational in less than 10 rhyming lines.\n\nOption A: Assume that √2 is rational, if you dare,\nThen p/q in lowest terms we declare.\nSo 2 = p²/q², rearrange with care,\nThus p² = 2q², now we're getting somewhere.\n\nThis means p² is even, that's quite clear,\nSo p must be even too, my dear.\nLet p = 2k, substitute back here,\n4k² = 2q², so q² = 2k², oh dear!\n\nNow q is even too, a contradiction severe,\nFor p/q in lowest terms cannot be, I fear!\n\nOption B: Let's suppose that root of two\nCan be written as p over q, it's true.\nBoth p and q have no common factor,\nThis assumption we'll soon shatter.\n\nSquare both sides: two equals p squared over q squared,\nRearranging: p squared equals two q squared, prepared.\nSince p squared is even, p must be even too,\nBut wait! This makes q even, our assumption's through!\nA contradiction found, our proof is now complete,\nRoot two's irrational, our logic can't be beat!"
    }
  ];

  // Add real examples first
  realExamples.forEach((example, i) => {
    tasks.push({
      id: generateUUID(`mt-bench-${(i + 4).toString().padStart(3, '0')}`),
      title: example.title,
      description: example.desc,
      task_type: "pairwise_ab",
      instructions: example.instruction,
      reward_amount: 0.02,
      reward_currency: "USDC",
      max_submissions: 100,
      difficulty_level: (i % 5) + 1,
      estimated_time_minutes: Math.floor(Math.random() * 5) + 3,
      category_name: "RLHF Rating",
      created_at: new Date(Date.now() - Math.random() * 86400000 * 3).toISOString(),
      expires_at: new Date(Date.now() + 86400000 * 7).toISOString(),
      user_has_submitted: false,
      status: "active",
      priority: i + 4
    });
  });

  // Generate remaining tasks to reach 60
  const topics = ["Problem Solving", "Creative Writing", "Code Review", "Data Analysis", "Mathematical Reasoning"];
  for (let i = tasks.length + 1; i <= 60; i++) {
    const topic = topics[i % topics.length];
    tasks.push({
      id: generateUUID(`mt-bench-${i.toString().padStart(3, '0')}`),
      title: `A/B Preference – MTBench #${100 + i}`,
      description: `Compare two AI responses for ${topic.toLowerCase()} and choose the better one`,
      task_type: "pairwise_ab",
      instructions: `Evaluate the quality, accuracy, and helpfulness of both responses for this ${topic.toLowerCase()} task.`,
      reward_amount: 0.02,
      reward_currency: "USDC",
      max_submissions: 100,
      difficulty_level: Math.floor(Math.random() * 5) + 1,
      estimated_time_minutes: Math.floor(Math.random() * 8) + 3,
      category_name: "RLHF Rating",
      created_at: new Date(Date.now() - Math.random() * 86400000 * 3).toISOString(),
      expires_at: new Date(Date.now() + 86400000 * 7).toISOString(),
      user_has_submitted: false,
      status: "active",
      priority: i
    });
  }
  return tasks;
};

const allMockTasks = generateMoreTasks();

/**
 * Get tasks list - using mock data for demo
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');
    const status = searchParams.get('status') || 'active';

    console.log('🔍 Tasks API: Request params:', { limit, offset, status });

    // Validate parameters
    if (limit > 100 || limit < 1 || offset < 0) {
      return NextResponse.json(
        { error: 'Invalid pagination parameters' },
        { status: 400 }
      );
    }

    // Filter tasks by status
    const filteredTasks = allMockTasks.filter(task => task.status === status);

    // Apply pagination
    const paginatedTasks = filteredTasks.slice(offset, offset + limit);

    console.log('🔍 Tasks API: Returning', paginatedTasks.length, 'of', filteredTasks.length, 'total tasks');

    return NextResponse.json({
      success: true,
      tasks: paginatedTasks,
      pagination: {
        limit,
        offset,
        count: paginatedTasks.length,
        total: filteredTasks.length,
        has_more: offset + limit < filteredTasks.length
      }
    });

  } catch (error) {
    console.error('Tasks API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tasks' },
      { status: 500 }
    );
  }
}

/**
 * Create new task - simplified for demo
 */
export async function POST(req: NextRequest) {
  try {
    return NextResponse.json(
      { error: 'Task creation not implemented in demo' },
      { status: 501 }
    );
  } catch (error) {
    console.error('Task creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create task' },
      { status: 500 }
    );
  }
}