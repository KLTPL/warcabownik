import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from "@nestjs/common";
import axios from "axios";

interface AiMoveStep {
  fromPosition: { x: number; y: number };
  toPosition: { x: number; y: number };
}
interface AiMoveResponse {
  moves: AiMoveStep[];
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  public wakeUpAi(): void {
    this.logger.log(`Sending ping to wake up the AI server...`);

    axios.get(`${process.env.AI_URL}/docs`, { timeout: 3000 })
      .then(() => {
        this.logger.log('Wake-up signal: AI server is already active and ready to respond.');
      })
      .catch((error) => {
        const msg = axios.isAxiosError(error) ? error.message: String(error);
        this.logger.log(`Wake-up signal sent. The AI server is probably waking up now (${msg}).`)
      });
  }


  async getAiMove(
    boardStateJson: string,
  ): Promise<{ fromPosition: string; toPosition: string }[]> {
    const parsedJson: unknown = JSON.parse(boardStateJson);
    const rawBoard = parsedJson as string[][];

    const numericBoard: number[][] = rawBoard.map((row) =>
      row.map((cell) => {
        if (!cell || cell ==="") return 0;
        if (cell === "w") return 1;
        if (cell === "b") return 2;
        if (cell === "W") return 3;
        if (cell === "B") return 4;
        return 0;
      }),
    );

    let retries = 15;
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
          { timeout: 10000 }
        );
        this.logger.log("Response");

        return response.data.moves.map(step => ({
          fromPosition: this.toAlgebraic(step.fromPosition.x, step.fromPosition.y),
          toPosition: this.toAlgebraic(step.toPosition.x, step.toPosition.y),
        }));
        
      } catch (error) {
        let errorMessage = "Unknown error";
        if (axios.isAxiosError(error)){
          errorMessage = `Axios Error: ${error.message}`;
          if (error.response?.data) {
            errorMessage += ` | Data: ${JSON.stringify(error.response.data)}`;
          }
        } else if (error instanceof Error) {
          errorMessage = error.message;
        } else {
          errorMessage = String(error)
        }
        
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
