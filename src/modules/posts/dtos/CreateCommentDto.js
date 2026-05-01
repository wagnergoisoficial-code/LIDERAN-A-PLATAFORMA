const { ValidationError } = require('../../../shared/errors/AppError');
const ValidationUtil = require('../../../shared/utils/validation.util');

// Create Comment DTO
class CreateCommentDto {
  constructor(data) {
    this.content = data.content;
    this.postId = data.postId;
    this.userId = data.userId;
  }

  validate() {
    if (ValidationUtil.isEmpty(this.content)) {
      throw new ValidationError('Comment content is required');
    }

    if (this.content.trim().length < 1) {
      throw new ValidationError('Comment cannot be empty');
    }

    if (ValidationUtil.isEmpty(this.postId)) {
      throw new ValidationError('Post ID is required');
    }

    if (ValidationUtil.isEmpty(this.userId)) {
      throw new ValidationError('User ID is required');
    }

    return true;
  }
}

module.exports = CreateCommentDto;
