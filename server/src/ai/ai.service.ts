import { Injectable } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class AiService {
  async getAiMove(boardState: string) {
    const response = await axios.post('http://localhost:8000/predict-move', {
      boardState,
    });
    return response.data;
  }
}