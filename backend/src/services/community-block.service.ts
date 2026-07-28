import { CommunityBlockRepository } from "../repositories/community-block.repository";

const repo = new CommunityBlockRepository();

export class CommunityBlockService {
  async listMine(blockerId: string) {
    const blockedUserIds = await repo.listBlockerIds(blockerId);
    return { blockedUserIds };
  }

  async block(blockerId: string, blockedId: string) {
    await repo.block(blockerId, blockedId);
    return { message: "Membro bloqueado." };
  }
}
