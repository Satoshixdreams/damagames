import { GoogleGenAI } from "@google/genai";
import { BoardState, Player } from "../types";
import { boardToString } from "../utils/checkersLogic";

// NOTE: In a real production app, you should proxy this through a backend.
// For this demo, we rely on the user providing the key via environment or we assume it is set.
// The prompt explicitly forbids asking for input, so we assume process.env.API_KEY is valid.

export const getGeminiAdvice = async (board: BoardState, currentPlayer: Player): Promise<string> => {
  try {
    const apiKey = process.env.API_KEY;
    if (!apiKey) return "API Key not found. Please set REACT_APP_API_KEY or process.env.API_KEY.";

    const ai = new GoogleGenAI({ apiKey });

    const boardStr = boardToString(board);
    // Player.RED is effectively "BLUE" now in the UI, so we map text to avoid confusion for the AI.
    const playerColorName = currentPlayer === Player.RED ? "Blue" : "White";

    const prompt = `
      You are an expert Checkers (Dama) coach.
      Analyze the following board state.
      
      Current Player: ${playerColorName}
      
      Board Representation ([ ] is empty, [B] is Blue, [W] is White, [BK]/[WK] are Kings):
      ${boardStr}
      
      Board Orientation: 
      - Row 0 is top. Row 7 is bottom.
      - White starts at top (Rows 0-2) and moves DOWN (increasing row index).
      - Blue starts at bottom (Rows 5-7) and moves UP (decreasing row index).
      
      Task:
      Provide a very brief, strategic tip (max 2 sentences) for the ${playerColorName} player.
      Focus on controlling the center, protecting kings, or setting up a double jump if visible. 
      Do not describe the board back to me. Just give the advice.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text || "Watch your diagonals and focus on defense!";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "I'm having trouble analyzing the board right now. Focus on defense!";
  }
};