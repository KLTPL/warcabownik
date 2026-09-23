import { ConflictException, Injectable } from "@nestjs/common";
import { Prisma } from "generated/prisma/client";
import { PrismaService } from "src/prisma/prisma.service";
import { UserEntity } from "./entities/user.entity";

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  async findByEmail(email: string) {
    return await this.prisma.user.findUnique({ where: { email } });
  }
  
  async findByGoogleId(googleId: string) {
  return this.prisma.user.findUnique({ where: { googleId } });
  }

  async findByGithubId(githubId: string) {
    return this.prisma.user.findUnique({ where: { githubId } });
  }

  async createOAuthUser(dto: { email: string; username: string; googleId?: string; githubId?: string }) {
    return this.prisma.user.create({
      data: dto,
    });
  }

  async linkOAuthProvider(userId: string, data: { googleId?: string; githubId?: string }) {
    return this.prisma.user.update({
      where: { id: userId },
      data,
    });
  }

  async create(data: Prisma.UserCreateInput): Promise<UserEntity | undefined> {
    try {
      return await this.prisma.user.create({
        data,
        omit: { passwordHash: true },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new ConflictException("EmailAlreadyUsed");
      }
    }
  }
}
