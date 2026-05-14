"""
Tic-Tac-Toe game logic module.
Provides the core game engine with board management, move validation,
win detection, and AI opponent functionality.
"""

from typing import Optional, Literal

Player = Literal["X", "O"]
Board = list[list[Optional[Player]]]


class TicTacToe:
    """Core Tic-Tac-Toe game engine."""

    def __init__(self):
        self.board: Board = [[None for _ in range(3)] for _ in range(3)]
        self.current_player: Player = "X"
        self.winner: Optional[Player] = None
        self.is_draw: bool = False
        self.move_count: int = 0

    def reset(self) -> None:
        """Reset the game to initial state."""
        self.board = [[None for _ in range(3)] for _ in range(3)]
        self.current_player = "X"
        self.winner = None
        self.is_draw = False
        self.move_count = 0

    def make_move(self, row: int, col: int) -> dict:
        """
        Make a move on the board.

        Args:
            row: Row index (0-2)
            col: Column index (0-2)

        Returns:
            dict with move result containing:
                - success: bool
                - message: str
                - board: current board state
                - current_player: whose turn it is
                - winner: winner if any
                - is_draw: whether game is a draw
                - game_over: whether game has ended
        """
        if self.winner or self.is_draw:
            return self._response(False, "Game is already over.")

        if not (0 <= row <= 2 and 0 <= col <= 2):
            return self._response(False, "Invalid position. Row and column must be 0-2.")

        if self.board[row][col] is not None:
            return self._response(False, "Cell is already occupied.")

        self.board[row][col] = self.current_player
        self.move_count += 1

        if self._check_winner(row, col):
            self.winner = self.current_player
            return self._response(True, f"Player {self.winner} wins!", game_over=True)

        if self.move_count == 9:
            self.is_draw = True
            return self._response(True, "Game is a draw!", game_over=True)

        self.current_player = "O" if self.current_player == "X" else "X"
        return self._response(True, f"Move accepted. {self.current_player}'s turn.")

    def _check_winner(self, row: int, col: int) -> bool:
        """Check if the last move resulted in a win."""
        player = self.board[row][col]

        # Check row
        if all(self.board[row][c] == player for c in range(3)):
            return True

        # Check column
        if all(self.board[r][col] == player for r in range(3)):
            return True

        # Check diagonal (top-left to bottom-right)
        if row == col and all(self.board[i][i] == player for i in range(3)):
            return True

        # Check anti-diagonal (top-right to bottom-left)
        if row + col == 2 and all(self.board[i][2 - i] == player for i in range(3)):
            return True

        return False

    def get_available_moves(self) -> list[tuple[int, int]]:
        """Get list of available (row, col) positions."""
        moves = []
        for r in range(3):
            for c in range(3):
                if self.board[r][c] is None:
                    moves.append((r, c))
        return moves

    def get_ai_move(self) -> Optional[tuple[int, int]]:
        """
        Get the best move for the AI (minimax algorithm).
        AI plays as 'O'.
        """
        if self.winner or self.is_draw:
            return None

        available = self.get_available_moves()
        if not available:
            return None

        best_score = float("-inf")
        best_move = available[0]

        for row, col in available:
            self.board[row][col] = "O"
            score = self._minimax(False)
            self.board[row][col] = None

            if score > best_score:
                best_score = score
                best_move = (row, col)

        return best_move

    def _minimax(self, is_maximizing: bool) -> int:
        """Minimax algorithm for AI move selection."""
        # Check terminal states
        winner = self._check_board_winner()
        if winner == "O":
            return 10
        elif winner == "X":
            return -10
        elif len(self.get_available_moves()) == 0:
            return 0

        if is_maximizing:
            best_score = float("-inf")
            for row, col in self.get_available_moves():
                self.board[row][col] = "O"
                score = self._minimax(False)
                self.board[row][col] = None
                best_score = max(score, best_score)
            return best_score
        else:
            best_score = float("inf")
            for row, col in self.get_available_moves():
                self.board[row][col] = "X"
                score = self._minimax(True)
                self.board[row][col] = None
                best_score = min(score, best_score)
            return best_score

    def _check_board_winner(self) -> Optional[Player]:
        """Check if there's a winner on the current board state."""
        for player in ["X", "O"]:
            # Check rows
            for r in range(3):
                if all(self.board[r][c] == player for c in range(3)):
                    return player
            # Check columns
            for c in range(3):
                if all(self.board[r][c] == player for r in range(3)):
                    return player
            # Check diagonals
            if all(self.board[i][i] == player for i in range(3)):
                return player
            if all(self.board[i][2 - i] == player for i in range(3)):
                return player
        return None

    def get_state(self) -> dict:
        """Get the full current game state."""
        return self._response(True, "Current game state.")

    def _response(self, success: bool, message: str, game_over: bool = False) -> dict:
        """Build a standardized response dict."""
        return {
            "success": success,
            "message": message,
            "board": self.board,
            "current_player": self.current_player,
            "winner": self.winner,
            "is_draw": self.is_draw,
            "game_over": game_over or self.winner is not None or self.is_draw,
            "move_count": self.move_count,
        }
