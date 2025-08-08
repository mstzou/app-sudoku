export type CellValue = number | 0;
export type Grid = CellValue[][]; // 9x9

export type Difficulty = "easy" | "medium" | "hard";

const GRID_SIZE = 9;
const BOX_SIZE = 3;

export function createEmptyGrid(): Grid {
  return Array.from({ length: GRID_SIZE }, () => Array<CellValue>(GRID_SIZE).fill(0));
}

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function cloneGrid(grid: Grid): Grid {
  return grid.map((row) => [...row]);
}

export function isSafe(grid: Grid, row: number, col: number, num: number): boolean {
  // Row and column
  for (let i = 0; i < GRID_SIZE; i += 1) {
    if (grid[row][i] === num) return false;
    if (grid[i][col] === num) return false;
  }

  // 3x3 box
  const startRow = row - (row % BOX_SIZE);
  const startCol = col - (col % BOX_SIZE);
  for (let r = 0; r < BOX_SIZE; r += 1) {
    for (let c = 0; c < BOX_SIZE; c += 1) {
      if (grid[startRow + r][startCol + c] === num) return false;
    }
  }

  return true;
}

function findEmpty(grid: Grid): [number, number] | null {
  for (let r = 0; r < GRID_SIZE; r += 1) {
    for (let c = 0; c < GRID_SIZE; c += 1) {
      if (grid[r][c] === 0) return [r, c];
    }
  }
  return null;
}

export function solveGrid(grid: Grid): { solved: boolean; grid: Grid } {
  const working = cloneGrid(grid);

  const trySolve = (): boolean => {
    const empty = findEmpty(working);
    if (!empty) return true;
    const [row, col] = empty;

    for (const num of shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9])) {
      if (isSafe(working, row, col, num)) {
        working[row][col] = num;
        if (trySolve()) return true;
        working[row][col] = 0;
      }
    }
    return false;
  };

  const solved = trySolve();
  return { solved, grid: working };
}

export function generateSolvedGrid(): Grid {
  const grid = createEmptyGrid();

  // Seed diagonal boxes to reduce backtracking
  for (let k = 0; k < GRID_SIZE; k += BOX_SIZE) {
    const nums = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    let idx = 0;
    for (let r = 0; r < BOX_SIZE; r += 1) {
      for (let c = 0; c < BOX_SIZE; c += 1) {
        grid[k + r][k + c] = nums[idx] as CellValue;
        idx += 1;
      }
    }
  }

  const { solved, grid: solvedGrid } = solveGrid(grid);
  if (!solved) {
    // Fallback should be rare; try again recursively
    return generateSolvedGrid();
  }
  return solvedGrid;
}

function countSolutions(grid: Grid, cap: number = 2): number {
  const working = cloneGrid(grid);
  let solutions = 0;

  const backtrack = (): void => {
    if (solutions >= cap) return; // early exit
    const empty = findEmpty(working);
    if (!empty) {
      solutions += 1;
      return;
    }
    const [row, col] = empty;
    for (let num = 1; num <= 9; num += 1) {
      if (isSafe(working, row, col, num)) {
        working[row][col] = num;
        backtrack();
        working[row][col] = 0;
        if (solutions >= cap) return;
      }
    }
  };

  backtrack();
  return solutions;
}

function difficultyToRemovals(difficulty: Difficulty): number {
  switch (difficulty) {
    case "easy":
      return 40; // leaves ~41 clues
    case "medium":
      return 50; // leaves ~31 clues
    case "hard":
      return 56; // leaves ~25 clues
    default:
      return 45;
  }
}

export function generatePuzzle(difficulty: Difficulty = "easy"): {
  puzzle: Grid;
  solution: Grid;
} {
  const solution = generateSolvedGrid();
  const puzzle = cloneGrid(solution);

  const positions: Array<[number, number]> = [];
  for (let r = 0; r < GRID_SIZE; r += 1) {
    for (let c = 0; c < GRID_SIZE; c += 1) {
      positions.push([r, c]);
    }
  }
  const order = shuffle(positions);
  let removed = 0;
  const target = difficultyToRemovals(difficulty);

  for (const [r, c] of order) {
    if (removed >= target) break;
    const backup = puzzle[r][c];
    if (backup === 0) continue;
    puzzle[r][c] = 0;

    // Ensure uniqueness for kid-friendly puzzles; allow up to 2 checks per removal
    const solutions = countSolutions(puzzle, 2);
    if (solutions !== 1) {
      puzzle[r][c] = backup;
      continue;
    }
    removed += 1;
  }

  return { puzzle, solution };
}

export function getPeers(row: number, col: number): Array<[number, number]> {
  const peers: Array<[number, number]> = [];
  for (let i = 0; i < GRID_SIZE; i += 1) {
    if (i !== col) peers.push([row, i]);
    if (i !== row) peers.push([i, col]);
  }
  const startRow = row - (row % BOX_SIZE);
  const startCol = col - (col % BOX_SIZE);
  for (let r = 0; r < BOX_SIZE; r += 1) {
    for (let c = 0; c < BOX_SIZE; c += 1) {
      const rr = startRow + r;
      const cc = startCol + c;
      if (rr === row && cc === col) continue;
      peers.push([rr, cc]);
    }
  }
  // Remove duplicates
  const unique = new Set(peers.map(([r, c]) => `${r},${c}`));
  return Array.from(unique).map((s) => {
    const [r, c] = s.split(",").map((v) => parseInt(v, 10));
    return [r, c] as [number, number];
  });
}

export function findConflicts(grid: Grid, row: number, col: number, value: number): Array<[number, number]> {
  if (value === 0) return [];
  const conflicts: Array<[number, number]> = [];
  for (const [r, c] of getPeers(row, col)) {
    if (grid[r][c] === value) conflicts.push([r, c]);
  }
  return conflicts;
}

export function computeCandidates(grid: Grid, row: number, col: number): number[] {
  if (grid[row][col] !== 0) return [];
  const candidates: number[] = [];
  for (let num = 1; num <= 9; num += 1) {
    if (isSafe(grid, row, col, num)) candidates.push(num);
  }
  return candidates;
}

export function isComplete(grid: Grid): boolean {
  for (let r = 0; r < GRID_SIZE; r += 1) {
    for (let c = 0; c < GRID_SIZE; c += 1) {
      if (grid[r][c] === 0) return false;
    }
  }
  return true;
}

export function findEasyHint(grid: Grid): { row: number; col: number; value: number } | null {
  // Single-candidate hint
  for (let r = 0; r < GRID_SIZE; r += 1) {
    for (let c = 0; c < GRID_SIZE; c += 1) {
      if (grid[r][c] !== 0) continue;
      const candidates = computeCandidates(grid, r, c);
      if (candidates.length === 1) return { row: r, col: c, value: candidates[0]! };
    }
  }
  return null;
}

export function serialize(grid: Grid): string {
  return grid.flat().join("");
}

export function deserialize(s: string): Grid {
  const nums = s.split("").map((ch) => parseInt(ch, 10) || 0);
  const grid: Grid = [];
  for (let r = 0; r < GRID_SIZE; r += 1) {
    grid.push(nums.slice(r * GRID_SIZE, (r + 1) * GRID_SIZE) as Grid[number]);
  }
  return grid;
}


