"""
FastAPI server for Tic-Tac-Toe game.
Provides REST API endpoints to play the game and serves the frontend.
"""

from fastapi import FastAPI, HTTPException
from fastapi.responses import HTMLResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
import os

from .game import TicTacToe

app = FastAPI(title="Tic-Tac-Toe API")

# Game instance (single game for simplicity)
game = TicTacToe()


class MoveRequest(BaseModel):
    row: int = Field(..., ge=0, le=2, description="Row index (0-2)")
    col: int = Field(..., ge=0, le=2, description="Column index (0-2)")


class AIRequest(BaseModel):
    player: str = Field(default="X", description="Player making the move before AI")


@app.get("/api/state")
def get_state():
    """Get the current game state."""
    return game.get_state()


@app.post("/api/reset")
def reset_game():
    """Reset the game board."""
    game.reset()
    return {"success": True, "message": "Game reset.", **game.get_state()}


@app.post("/api/move")
def make_move(move: MoveRequest):
    """Make a move on the board."""
    result = game.make_move(move.row, move.col)
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["message"])
    return result


@app.post("/api/ai-move")
def ai_move():
    """Let the AI make a move (AI plays as 'O')."""
    if game.winner or game.is_draw:
        raise HTTPException(status_code=400, detail="Game is already over.")

    if game.current_player != "O":
        raise HTTPException(status_code=400, detail="It's not AI's turn.")

    ai_move_pos = game.get_ai_move()
    if ai_move_pos is None:
        raise HTTPException(status_code=400, detail="No available moves.")

    row, col = ai_move_pos
    result = game.make_move(row, col)
    return result


@app.get("/", response_class=HTMLResponse)
def index():
    """Serve the frontend HTML."""
    html_path = os.path.join(os.path.dirname(__file__), "index.html")
    with open(html_path, "r", encoding="utf-8") as f:
        return HTMLResponse(content=f.read())


def run_server():
    """Run the FastAPI server with uvicorn."""
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000, log_level="info")


if __name__ == "__main__":
    run_server()
