const { ValidationError } = require('../../../shared/errors/AppError');
const ValidationUtil = require('../../../shared/utils/validation.util');

// Create Post DTO
class CreatePostDto {
  constructor(data) {
    this.content = data.content;
    this.imageUrl = data.imageUrl;
    this.userId = data.userId;
    this.churchId = data.churchId;
  }

  validate() {
    if (ValidationUtil.isEmpty(this.content)) {
      throw new ValidationError('Content is required');
    }

    if (this.content.trim().length < 3) {
      throw new ValidationError('Content must be at least 3 characters');
    }

    if (ValidationUtil.isEmpty(this.userId)) {
      throw new ValidationError('User ID is required');
    }

    if (ValidationUtil.isEmpty(this.churchId)) {
      throw new ValidationError('Church ID is required');
    }

    return true;
  }
}

module.exports = CreatePostDto;
