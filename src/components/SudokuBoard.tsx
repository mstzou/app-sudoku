"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { findConflicts, findEasyHint, generatePuzzle, Grid, serialize } from "@/lib/sudoku";

type Difficulty = "easy" | "medium" | "hard";

type Props = {
  difficulty?: Difficulty;
};

type Notes = Record<string, Set<number>>; // key "r,c" -> candidates

function keyOf(row: number, col: number): string {
  return `${row},${col}`;
}

export default function SudokuBoard({ difficulty = "easy" }: Props) {
  const [{ puzzle, solution }, setGame] = useState(() => generatePuzzle(difficulty));
  const [grid, setGrid] = useState<Grid>(() => puzzle.map((r) => [...r]));
  const [selected, setSelected] = useState<{ row: number; col: number } | null>(null);
  const [notes, setNotes] = useState<Notes>({});
  const [mistakesOn, setMistakesOn] = useState(true);
  const [noteMode, setNoteMode] = useState(false);
  const [status, setStatus] = useState<string>("Fill the board with numbers 1-9!");

  // Persist last game in localStorage
  const initialLoad = useRef(true);
  useEffect(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem("sudoku:last") : null;
    if (saved && initialLoad.current) {
      try {
        const parsed = JSON.parse(saved) as {
          grid: string;
          puzzle: string;
          solution: string;
          difficulty: Difficulty;
          mistakesOn: boolean;
          noteMode: boolean;
        };
        const puzzleGrid: Grid = parsed.puzzle
          .match(/.{1,9}/g)!
          .map((row) => row.split("").map((n) => parseInt(n, 10) || 0));
        const solutionGrid: Grid = parsed.solution
          .match(/.{1,9}/g)!
          .map((row) => row.split("").map((n) => parseInt(n, 10) || 0));
        const gridGrid: Grid = parsed.grid
          .match(/.{1,9}/g)!
          .map((row) => row.split("").map((n) => parseInt(n, 10) || 0));
        setGame({ puzzle: puzzleGrid, solution: solutionGrid });
        setGrid(gridGrid);
        setMistakesOn(parsed.mistakesOn);
        setNoteMode(parsed.noteMode);
        setStatus("Welcome back! Continue your game.");
      } catch {
        // ignore
      }
    }
    initialLoad.current = false;
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const payload = {
      grid: serialize(grid),
      puzzle: serialize(puzzle),
      solution: serialize(solution),
      difficulty,
      mistakesOn,
      noteMode,
    };
    localStorage.setItem("sudoku:last", JSON.stringify(payload));
  }, [grid, puzzle, solution, difficulty, mistakesOn, noteMode]);

  const givenCells = useMemo(() => {
    const set = new Set<string>();
    for (let r = 0; r < 9; r += 1) {
      for (let c = 0; c < 9; c += 1) {
        if (puzzle[r][c] !== 0) set.add(keyOf(r, c));
      }
    }
    return set;
  }, [puzzle]);

  const isComplete = useMemo(() => {
    for (let r = 0; r < 9; r += 1) {
      for (let c = 0; c < 9; c += 1) {
        if (grid[r][c] === 0) return false;
      }
    }
    return true;
  }, [grid]);

  useEffect(() => {
    if (isComplete) {
      const correct = serialize(grid) === serialize(solution);
      setStatus(correct ? "Great job! You solved it!" : "Not quite yet. There are mistakes—keep trying!");
    }
  }, [isComplete, grid, solution]);

  function startNew(newDifficulty: Difficulty) {
    const next = generatePuzzle(newDifficulty);
    setGame(next);
    setGrid(next.puzzle.map((r) => [...r]));
    setNotes({});
    setSelected(null);
    setStatus("New puzzle started. Have fun!");
  }

  function handleCellSelect(row: number, col: number) {
    setSelected({ row, col });
  }

  function setNumber(value: number) {
    if (!selected) return;
    const { row, col } = selected;
    if (givenCells.has(keyOf(row, col))) return;

    setGrid((prev) => {
      const next = prev.map((r) => [...r]);
      if (noteMode) {
        setNotes((old) => {
          const k = keyOf(row, col);
          const set = new Set(old[k] ?? []);
          if (set.has(value)) set.delete(value);
          else set.add(value);
          return { ...old, [k]: set };
        });
      } else {
        next[row][col] = value;
        // Clear notes in the same cell
        setNotes((old) => {
          const copy = { ...old };
          delete copy[keyOf(row, col)];
          return copy;
        });
      }
      return next;
    });
  }

  function erase() {
    if (!selected) return;
    const { row, col } = selected;
    if (givenCells.has(keyOf(row, col))) return;
    setGrid((prev) => {
      const next = prev.map((r) => [...r]);
      next[row][col] = 0;
      return next;
    });
    setNotes((old) => {
      const copy = { ...old };
      delete copy[keyOf(row, col)];
      return copy;
    });
  }

  function hint() {
    const easy = findEasyHint(grid);
    if (easy) {
      const { row, col, value } = easy;
      setSelected({ row, col });
      setNumber(value);
      setStatus("Hint used: a cell had only one choice.");
      return;
    }
    // Fallback: reveal a correct cell that isn't filled yet
    outer: for (let r = 0; r < 9; r += 1) {
      for (let c = 0; c < 9; c += 1) {
        if (grid[r][c] === 0) {
          setSelected({ row: r, col: c });
          setNumber(solution[r][c]!);
          setStatus("Hint used: revealed a number.");
          break outer;
        }
      }
    }
  }

  function toggleNotes() {
    setNoteMode((v) => !v);
  }

  function toggleMistakes() {
    setMistakesOn((v) => !v);
  }

  function cellClasses(r: number, c: number): string {
    const isSelected = selected?.row === r && selected?.col === c;
    const isSameRowCol = selected && (selected.row === r || selected.col === c);
    const isSameBox = selected && Math.floor(selected.row / 3) === Math.floor(r / 3) && Math.floor(selected.col / 3) === Math.floor(c / 3);
    let cls = "w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center border text-lg sm:text-xl font-medium select-none cursor-pointer transition-colors";
    cls += " bg-white dark:bg-neutral-900";
    cls += " border-neutral-300 dark:border-neutral-700";
    if (isSelected) cls += " bg-yellow-100 dark:bg-yellow-900/40";
    else if (isSameRowCol || isSameBox) cls += " bg-yellow-50 dark:bg-yellow-900/20";
    if (c === 2 || c === 5) cls += " border-r-2";
    if (r === 2 || r === 5) cls += " border-b-2";
    return cls;
  }

  function renderCell(r: number, c: number) {
    const value = grid[r][c];
    const given = givenCells.has(keyOf(r, c));
    const sameNumberSelected = selected && grid[selected.row][selected.col] !== 0 && grid[selected.row][selected.col] === value;
    const conflicts = mistakesOn && value !== 0 ? findConflicts(grid, r, c, value) : [];

    return (
      <button
        key={keyOf(r, c)}
        className={cellClasses(r, c)}
        onClick={() => handleCellSelect(r, c)}
      >
        <div className="relative w-full h-full flex items-center justify-center">
          {value !== 0 ? (
            <span
              className={
                "" +
                (given
                  ? " text-blue-700 dark:text-blue-400 font-bold"
                  : sameNumberSelected
                  ? " text-emerald-700 dark:text-emerald-400"
                  : " text-neutral-800 dark:text-neutral-200")
              }
            >
              {value}
            </span>
          ) : (
            <div className="grid grid-cols-3 grid-rows-3 gap-0.5 w-full h-full p-1 opacity-70">
              {Array.from({ length: 9 }, (_, i) => i + 1).map((n) => (
                <span key={n} className="text-[10px] leading-3 text-neutral-500 dark:text-neutral-400 text-center">
                  {notes[keyOf(r, c)]?.has(n) ? n : ""}
                </span>
              ))}
            </div>
          )}
          {mistakesOn && conflicts.length > 0 && !given && value !== 0 && (
            <span className="absolute -top-1 -right-1 text-[10px] text-red-600">×</span>
          )}
        </div>
      </button>
    );
  }

  function NumberPad() {
    return (
      <div className="grid grid-cols-5 gap-2">
        {Array.from({ length: 9 }, (_, i) => i + 1).map((n) => (
          <button
            key={n}
            className="rounded-md bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 px-4 py-2 text-lg"
            onClick={() => setNumber(n)}
          >
            {n}
          </button>
        ))}
        <button
          className="rounded-md bg-rose-100 dark:bg-rose-900/40 hover:bg-rose-200 dark:hover:bg-rose-900/60 px-4 py-2 text-lg col-span-2"
          onClick={erase}
        >
          Erase
        </button>
        <button
          className={`rounded-md px-4 py-2 text-lg col-span-3 ${noteMode ? "bg-amber-200 dark:bg-amber-800" : "bg-amber-100 dark:bg-amber-900/40 hover:bg-amber-200 dark:hover:bg-amber-900/60"}`}
          onClick={toggleNotes}
        >
          Notes {noteMode ? "On" : "Off"}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 items-center">
      <h1 className="text-2xl sm:text-3xl font-bold">Sudoku Fun</h1>
      <p className="text-sm text-neutral-600 dark:text-neutral-400">{status}</p>

      <div className="flex flex-col sm:flex-row gap-6 items-center">
        <div className="grid grid-cols-9 grid-rows-9 bg-neutral-200 dark:bg-neutral-800 p-2 rounded-md">
          {Array.from({ length: 9 }, (_, r) =>
            Array.from({ length: 9 }, (_, c) => renderCell(r, c))
          )}
        </div>

        <div className="flex flex-col gap-3 w-full sm:w-auto">
          <NumberPad />
          <div className="flex gap-2 flex-wrap">
            <button
              className="rounded-md bg-sky-100 dark:bg-sky-900/40 hover:bg-sky-200 dark:hover:bg-sky-900/60 px-4 py-2"
              onClick={() => hint()}
            >
              Hint
            </button>
            <button
              className="rounded-md bg-green-100 dark:bg-green-900/40 hover:bg-green-200 dark:hover:bg-green-900/60 px-4 py-2"
              onClick={() => startNew("easy")}
            >
              New Easy
            </button>
            <button
              className="rounded-md bg-yellow-100 dark:bg-yellow-900/40 hover:bg-yellow-200 dark:hover:bg-yellow-900/60 px-4 py-2"
              onClick={() => startNew("medium")}
            >
              New Medium
            </button>
            <button
              className="rounded-md bg-orange-100 dark:bg-orange-900/40 hover:bg-orange-200 dark:hover:bg-orange-900/60 px-4 py-2"
              onClick={() => startNew("hard")}
            >
              New Hard
            </button>
            <button
              className={`rounded-md px-4 py-2 ${mistakesOn ? "bg-red-200 dark:bg-red-800" : "bg-red-100 dark:bg-red-900/40 hover:bg-red-200 dark:hover:bg-red-900/60"}`}
              onClick={toggleMistakes}
            >
              Mistakes {mistakesOn ? "On" : "Off"}
            </button>
          </div>
        </div>
      </div>

      <div className="text-xs text-neutral-500 dark:text-neutral-400">
        Tip: Tap a cell, then tap a number. Turn on Notes to jot candidates!
      </div>
    </div>
  );
}


