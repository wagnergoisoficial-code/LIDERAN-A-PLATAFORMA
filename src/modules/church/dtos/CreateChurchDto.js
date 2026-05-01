const ValidationUtil = require('../../../shared/utils/validation.util');
const AppError = require('../../../shared/errors/AppError');

class CreateChurchDto {
  constructor(data = {}) {
    this.name = data.name;
    this.title = data.title;
    this.description = data.description;
    this.imageUrl = data.imageUrl;
    this.cultosDias = data.cultosDias; // JSON array: ["segunda", "quarta", "domingo"]
  }

  validate() {
    if (ValidationUtil.isEmpty(this.name)) {
      throw new AppError('Church name is required', 400);
    }

    return true;
  }
}

module.exports = CreateChurchDto;
