// /scripts3/contracts/shortestpathgrid.js
// Description: Solver for "Shortest Path in a Grid" contract.

export const CONTRACT_TYPE = "Shortest Path in a Grid";

/**
 * Solves the "Shortest Path in a Grid" contract.
 * @param {number[][]} grid - 2D array representing the grid.
 * @returns {string} - The shortest path as a string of UDLR, or an empty string if no path exists.
 */
export function solve(grid) {
    const numRows = grid.length;
    const numCols = grid[0].length;

    // Directions and their corresponding moves.
    const directions = [
        { r: -1, c: 0, move: 'U' }, // Up
        { r: 1, c: 0, move: 'D' },  // Down
        { r: 0, c: -1, move: 'L' }, // Left
        { r: 0, c: 1, move: 'R' }   // Right
    ];

    const isValidCell = (r, c) => r >= 0 && r < numRows && c >= 0 && c < numCols && grid[r][c] === 0;

    const queue = [{ r: 0, c: 0, path: "" }];
    const visited = Array.from({ length: numRows }, () => Array(numCols).fill(false));
    visited[0][0] = true;

    while (queue.length > 0) {
        const { r, c, path } = queue.shift();

        // Check if we reached the bottom-right corner.
        if (r === numRows - 1 && c === numCols - 1) {
            return path;
        }

        for (const { r: dr, c: dc, move } of directions) {
            const newRow = r + dr;
            const newCol = c + dc;

            if (isValidCell(newRow, newCol) && !visited[newRow][newCol]) {
                visited[newRow][newCol] = true;
                queue.push({ r: newRow, c: newCol, path: path + move });
            }
        }
    }

    return ""; // No valid path found.
}
