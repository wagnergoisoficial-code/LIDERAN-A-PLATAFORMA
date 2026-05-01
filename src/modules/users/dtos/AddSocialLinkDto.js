const { ValidationError } = require('../../../shared/errors/AppError');
const ValidationUtil = require('../../../shared/utils/validation.util');

class AddSocialLinkDto {
  constructor(data) {
    this.platform = data.platform;
    this.url = data.url;
  }

  validate() {
    const validPlatforms = ['whatsapp', 'linkedin', 'facebook', 'instagram'];
    
    if (!this.platform || !validPlatforms.includes(this.platform)) {
      throw new ValidationError('Plataforma inválida. Use: whatsapp, linkedin, facebook, instagram');
    }

    if (!this.url || !this.url.startsWith('http')) {
      throw new ValidationError('URL deve ser válida e começar com http:// ou https://');
    }

    return true;
  }
}

module.exports = AddSocialLinkDto;
