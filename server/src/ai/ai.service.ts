import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from "@nestjs/common";
import axios from "axios";

interface AiMoveResponse {
  fromPosition: { x: number; y: number };
  toPosition: { x: number; y: number };
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  async getAiMove(
    boardStateJson: string,
  ): Promise<{ fromPosition: string; toPosition: string }> {
    const parsedJson: unknown = JSON.parse(boardStateJson);
    const rawBoard = parsedJson as string[][];

    const numericBoard: number[][] = rawBoard.map((row) =>
      row.map((cell) => {
        if (!cell) return 0;
        const lower = cell.toLowerCase();
        if (lower === "w") return 1;
        if (lower === "b") return 2;
        return 0;
      }),
    );

    let retries = 5;
    while (retries > 0) {
      try {
        this.logger.log(
          `Making a POST request to ${process.env.AI_URL}/predict-move `,
        );
        const response = await axios.post<AiMoveResponse>(
          `${process.env.AI_URL}/predict-move`,
          {
            board: numericBoard,
            player_id: 2,
          },
        );
        this.logger.log("Response");

        const { fromPosition, toPosition } = response.data;
        return {
          fromPosition: this.toAlgebraic(fromPosition.x, fromPosition.y),
          toPosition: this.toAlgebraic(toPosition.x, toPosition.y),
        };
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        this.logger.warn(
          `AI attempt failed (${errorMessage}). Retrying in 3s... (${retries - 1} left)`,
        );

        retries--;
        if (retries === 0) {
          throw new InternalServerErrorException("FailedToFetchAiMove");
        }
        await new Promise((resolve) => setTimeout(resolve, 3000));
      }
    }
    throw new InternalServerErrorException("FailedToFetchAiMove");
  }

  private toAlgebraic(x: number, y: number): string {
    return `${String.fromCharCode(97 + x)}${y + 1}`;
  }
}
