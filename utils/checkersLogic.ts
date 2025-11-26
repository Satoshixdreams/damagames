
import { BoardState, Move, Piece, Player, Position } from '../types';
import { BOARD_SIZE } from '../constants';

export const createInitialBoard = (): BoardState => {
  const board: BoardState = Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(null));
  
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      // Turkish Dama: Fill entire rows 1, 2 for White and 5, 6 for Blue (Red in Logic)
      if (row === 1 || row === 2) {
        board[row][col] = { player: Player.WHITE, isKing: false };
      } else if (row === 5 || row === 6) {
        board[row][col] = { player: Player.RED, isKing: false };
      }
    }
  }
  return board;
};

export const isValidPos = (pos: Position): boolean => {
  return pos.row >= 0 && pos.row < BOARD_SIZE && pos.col >= 0 && pos.col < BOARD_SIZE;
};

export const getValidMoves = (board: BoardState, player: Player, fromPos?: Position | null): Move[] => {
  let moves: Move[] = [];
  
  if (fromPos) {
    // If we are forced to move a specific piece (e.g., mid-multijump)
    const piece = board[fromPos.row][fromPos.col];
    if (piece && piece.player === player) {
      moves = getPieceMoves(board, fromPos, piece);
    }
  } else {
    // Get all moves for all pieces
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        const piece = board[r][c];
        if (piece && piece.player === player) {
          const pieceMoves = getPieceMoves(board, { row: r, col: c }, piece);
          moves.push(...pieceMoves);
        }
      }
    }
  }

  // Turkish Dama Rule: Forced Captures
  // If ANY capture is available on the board, you MUST take a capture move.
  const captureMoves = moves.filter(m => m.isCapture);
  if (captureMoves.length > 0) {
    return captureMoves;
  }

  return moves;
};

export const getPieceMoves = (board: BoardState, pos: Position, piece: Piece): Move[] => {
  const moves: Move[] = [];
  
  // Orthogonal Directions: Up, Down, Left, Right
  const dirs = {
    UP: { r: -1, c: 0 },
    DOWN: { r: 1, c: 0 },
    LEFT: { r: 0, c: -1 },
    RIGHT: { r: 0, c: 1 }
  };

  const allowedDirections = [];

  if (piece.isKing) {
    allowedDirections.push(dirs.UP, dirs.DOWN, dirs.LEFT, dirs.RIGHT);
  } else {
    // Men move Forward and Sideways
    if (piece.player === Player.WHITE) {
      allowedDirections.push(dirs.DOWN, dirs.LEFT, dirs.RIGHT);
    } else {
      allowedDirections.push(dirs.UP, dirs.LEFT, dirs.RIGHT);
    }
  }

  if (piece.isKing) {
    // --- FLYING KING LOGIC ---
    allowedDirections.forEach(d => {
      // 1. Sliding Move
      let i = 1;
      while (true) {
        const target = { row: pos.row + d.r * i, col: pos.col + d.c * i };
        if (!isValidPos(target)) break;
        
        const cell = board[target.row][target.col];
        if (cell === null) {
          moves.push({ from: pos, to: target, isCapture: false });
        } else {
          break; // Blocked
        }
        i++;
      }

      // 2. Capture Move
      let dist = 1;
      while (true) {
        const checkPos = { row: pos.row + d.r * dist, col: pos.col + d.c * dist };
        if (!isValidPos(checkPos)) break;

        const cell = board[checkPos.row][checkPos.col];
        
        if (cell !== null) {
          if (cell.player !== piece.player) {
            // Found enemy, check landing spots behind it
            let jumpDist = 1;
            while (true) {
              const landPos = { row: checkPos.row + d.r * jumpDist, col: checkPos.col + d.c * jumpDist };
              if (!isValidPos(landPos)) break;
              
              const landCell = board[landPos.row][landPos.col];
              if (landCell === null) {
                moves.push({
                  from: pos,
                  to: landPos,
                  isCapture: true,
                  capturedPos: checkPos
                });
              } else {
                break; // Blocked after enemy
              }
              jumpDist++;
            }
          }
          break; // Cannot jump over two pieces or own piece
        }
        dist++;
      }
    });

  } else {
    // --- MAN LOGIC ---
    allowedDirections.forEach(d => {
      // 1. Simple Move
      const targetPos = { row: pos.row + d.r, col: pos.col + d.c };
      if (isValidPos(targetPos) && board[targetPos.row][targetPos.col] === null) {
        moves.push({ from: pos, to: targetPos, isCapture: false });
      }

      // 2. Capture Move
      const enemyPos = { row: pos.row + d.r, col: pos.col + d.c };
      const jumpPos = { row: pos.row + (d.r * 2), col: pos.col + (d.c * 2) };

      if (isValidPos(jumpPos) && isValidPos(enemyPos)) {
        const enemyPiece = board[enemyPos.row][enemyPos.col];
        const landingSquare = board[jumpPos.row][jumpPos.col];

        if (enemyPiece && enemyPiece.player !== piece.player && landingSquare === null) {
          moves.push({
            from: pos,
            to: jumpPos,
            isCapture: true,
            capturedPos: enemyPos
          });
        }
      }
    });
  }

  return moves;
};

export const applyMove = (currentBoard: BoardState, move: Move): { newBoard: BoardState, promoted: boolean } => {
  // Deep copy
  const newBoard = currentBoard.map(row => row.map(p => p ? { ...p } : null));
  
  const piece = newBoard[move.from.row][move.from.col];
  if (!piece) throw new Error("No piece at source");

  // Move piece
  newBoard[move.to.row][move.to.col] = piece;
  newBoard[move.from.row][move.from.col] = null;

  // Remove Captured
  if (move.isCapture && move.capturedPos) {
    newBoard[move.capturedPos.row][move.capturedPos.col] = null;
  }

  // Promotion
  let promoted = false;
  if (!piece.isKing) {
    // In Turkish Dama, promotion stops movement immediately usually, but checking end rows:
    if ((piece.player === Player.WHITE && move.to.row === BOARD_SIZE - 1) ||
        (piece.player === Player.RED && move.to.row === 0)) {
      piece.isKing = true;
      promoted = true;
    }
  }

  return { newBoard, promoted };
};

export const checkWinner = (board: BoardState): Player | null => {
  let redCount = 0;
  let whiteCount = 0;
  
  // Simple count is often enough for Game Over
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const p = board[r][c];
      if (p?.player === Player.RED) redCount++;
      if (p?.player === Player.WHITE) whiteCount++;
    }
  }

  // Also check for no moves
  if (redCount === 0) return Player.WHITE;
  if (whiteCount === 0) return Player.RED;
  
  // To be 100% accurate we should check if current player has valid moves
  // but this is expensive to run every render, so we rely on turn logic mostly.
  
  return null;
};

export const boardToString = (board: BoardState): string => {
    let str = "";
    for (let r = 0; r < BOARD_SIZE; r++) {
        let rowStr = `Row ${r}: `;
        for (let c = 0; c < BOARD_SIZE; c++) {
            const p = board[r][c];
            if (!p) rowStr += "[ ]";
            // Use 'B' for Blue (formerly Red)
            else rowStr += p.player === Player.RED ? `[B${p.isKing?'K':''}]` : `[W${p.isKing?'K':''}]`;
        }
        str += rowStr + "\n";
    }
    return str;
}