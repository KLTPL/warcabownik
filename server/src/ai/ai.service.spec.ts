import axios from "axios";
import { Side } from "@warcabownik/shared";
import { AiService } from "./ai.service";

jest.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe("AiService", () => {
  let service: AiService;

  const board: string[][] = [
    ["", "b", "", "b", "", "b", "", "b"],
    ["b", "", "b", "", "b", "", "b", ""],
    ["", "b", "", "b", "", "b", "", "b"],
    ["", "", "", "", "", "", "", ""],
    ["", "", "", "", "", "", "", ""],
    ["w", "", "w", "", "w", "", "w", ""],
    ["", "w", "", "w", "", "w", "", "w"],
    ["w", "", "w", "", "w", "", "w", ""],
  ];

  beforeEach(() => {
    service = new AiService();
    mockedAxios.post.mockResolvedValue({
      data: {
        moves: [{ fromPosition: { x: 0, y: 0 }, toPosition: { x: 1, y: 1 } }],
      },
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("requests a White move with player_id 1 when the AI plays White", async () => {
    await service.getAiMove(JSON.stringify(board), Side.WHITE);

    // eslint-disable-next-line @typescript-eslint/unbound-method -- jest mock reference, not an unbound call
    expect(mockedAxios.post).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ player_id: 1 }),
    );
  });

  it("requests a Black move with player_id 2 when the AI plays Black", async () => {
    await service.getAiMove(JSON.stringify(board), Side.BLACK);

    // eslint-disable-next-line @typescript-eslint/unbound-method -- jest mock reference, not an unbound call
    expect(mockedAxios.post).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ player_id: 2 }),
    );
  });
});
