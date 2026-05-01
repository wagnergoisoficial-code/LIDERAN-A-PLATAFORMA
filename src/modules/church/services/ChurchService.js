const ChurchRepository = require('../repositories/ChurchRepository');
const CreateChurchDto = require('../dtos/CreateChurchDto');
const AppError = require('../../../shared/errors/AppError');

class ChurchService {
  async createChurch(data, leaderId) {
    const createChurchDto = new CreateChurchDto(data);
    createChurchDto.validate();

    const churchData = {
      name: createChurchDto.name,
      title: createChurchDto.title,
      description: createChurchDto.description,
      imageUrl: createChurchDto.imageUrl,
      cultosDias: createChurchDto.cultosDias,
      leaderID: leaderId,
    };

    const church = await ChurchRepository.create(churchData);
    
    // Adicionar o líder à comunidade
    await ChurchRepository.addMemberToChurch(leaderId, church.id);

    return church;
  }

  async getChurch(churchId) {
    const church = await ChurchRepository.findById(churchId);

    if (!church) {
      throw new AppError('Church not found', 404);
    }

    // Parse cultosDias if it's a JSON string
    if (church.cultosDias) {
      try {
        church.cultosDias = JSON.parse(church.cultosDias);
      } catch {
        church.cultosDias = [];
      }
    }

    return church;
  }

  async getChurchesByLeader(leaderId) {
    const churches = await ChurchRepository.findByLeaderId(leaderId);
    
    return churches.map(church => ({
      ...church,
      cultosDias: church.cultosDias ? JSON.parse(church.cultosDias) : [],
    }));
  }

  async updateChurch(churchId, data, leaderId) {
    const church = await ChurchRepository.findById(churchId);

    if (!church) {
      throw new AppError('Church not found', 404);
    }

    // Apenas o líder pode atualizar
    if (church.leaderID !== leaderId) {
      throw new AppError('Only the church leader can update this church', 403);
    }

    const updateData = {
      name: data.name,
      title: data.title,
      description: data.description,
      imageUrl: data.imageUrl,
      cultosDias: data.cultosDias,
    };

    const updated = await ChurchRepository.update(churchId, updateData);

    if (updated.cultosDias) {
      try {
        updated.cultosDias = JSON.parse(updated.cultosDias);
      } catch {
        updated.cultosDias = [];
      }
    }

    return updated;
  }

  async deleteChurch(churchId, leaderId) {
    const church = await ChurchRepository.findById(churchId);

    if (!church) {
      throw new AppError('Church not found', 404);
    }

    // Apenas o líder pode deletar
    if (church.leaderID !== leaderId) {
      throw new AppError('Only the church leader can delete this church', 403);
    }

    return ChurchRepository.delete(churchId);
  }

  async getChurchMembers(churchId) {
    const church = await ChurchRepository.findById(churchId);

    if (!church) {
      throw new AppError('Church not found', 404);
    }

    return ChurchRepository.getMembers(churchId);
  }

  async addMemberToChurch(userId, churchId) {
    const church = await ChurchRepository.findById(churchId);

    if (!church) {
      throw new AppError('Church not found', 404);
    }

    return ChurchRepository.addMemberToChurch(userId, churchId);
  }
}

module.exports = new ChurchService();
