import { Injectable, InternalServerErrorException } from "@nestjs/common";
import axios from "axios";

@Injectable()
export class AiService {
  async getAiMove(
    boardStateJson: string,
  ): Promise<{ fromPosition: string; toPosition: string }> {
    const rawBoard: string[][] = JSON.parse(boardStateJson);

    const numericBoard: number[][] = rawBoard.map((row) =>
      row.map((cell) => {
        if (!cell) return 0;
        const lower = cell.toLowerCase();
        if (lower === "w") return 1;
        if (lower === "b") return 2;
        return 0;
      }),
    );

    try {
      const response = await axios.post(`${process.env.AI_URL}/predict-move`, {
        board: numericBoard,
        player_id: 2,
      });
      const { fromPosition, toPosition } = response.data;
      return {
        fromPosition: this.toAlgebraic(fromPosition.x, fromPosition.y),
        toPosition: this.toAlgebraic(toPosition.x, toPosition.y),
      };
    } catch (error) {
      throw new InternalServerErrorException("FailedToFetchAiMove");
    }
  }

  private toAlgebraic(x: number, y: number): string {
    return `${String.fromCharCode(97 + x)}${y + 1}`;
  }
}
