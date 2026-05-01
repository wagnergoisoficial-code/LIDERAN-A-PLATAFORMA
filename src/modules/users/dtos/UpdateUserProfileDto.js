const { ValidationError } = require('../../../shared/errors/AppError');
const ValidationUtil = require('../../../shared/utils/validation.util');

class UpdateUserProfileDto {
  constructor(data) {
    this.name = data.name;
    this.age = data.age;
    this.bio = data.bio;
    this.skills = data.skills; // Array of skills
    this.profileImage = data.profileImage;
    this.backgroundTheme = data.backgroundTheme;
    this.location = data.location;
    this.title = data.title;
    this.socialLinks = data.socialLinks; // Array of {platform, url}
  }

  validate() {
    if (this.name && this.name.trim().length < 2) {
      throw new ValidationError('Nome deve ter pelo menos 2 caracteres');
    }

    if (this.age && (this.age < 1 || this.age > 150)) {
      throw new ValidationError('Idade deve ser entre 1 e 150');
    }

    if (this.bio && this.bio.trim().length > 500) {
      throw new ValidationError('Bio não pode ter mais de 500 caracteres');
    }

    if (this.backgroundTheme && !['light', 'dark', 'blue', 'green', 'purple'].includes(this.backgroundTheme)) {
      throw new ValidationError('Tema de fundo inválido');
    }

    if (this.socialLinks && Array.isArray(this.socialLinks)) {
      const validPlatforms = ['whatsapp', 'linkedin', 'facebook', 'instagram'];
      for (const link of this.socialLinks) {
        if (!validPlatforms.includes(link.platform)) {
          throw new ValidationError(`Plataforma "${link.platform}" não é válida`);
        }
        if (!link.url || !link.url.startsWith('http')) {
          throw new ValidationError('URL de rede social inválida');
        }
      }
    }

    return true;
  }
}

module.exports = UpdateUserProfileDto;
