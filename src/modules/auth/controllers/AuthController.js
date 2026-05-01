const RegisterDto = require('../dtos/RegisterDto');
const RegisterMemberDto = require('../dtos/RegisterMemberDto');
const LoginDto = require('../dtos/LoginDto');

// Auth Controller - HTTP layer
class AuthController {
  constructor(authService) {
    this.authService = authService;
  }

  async register(req, res, next) {
    try {
      const dto = new RegisterDto(req.body);
      dto.validate();

      const result = await this.authService.register(dto);

      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async registerMember(req, res, next) {
    try {
      const dto = new RegisterMemberDto(req.body);
      dto.validate();
      const leaderId = req.user.id;

      const result = await this.authService.registerMember(dto, leaderId);

      res.status(201).json({
        success: true,
        message: 'Member registered successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async login(req, res, next) {
    try {
      const dto = new LoginDto(req.body);
      dto.validate();

      const result = await this.authService.login(dto);

      res.status(200).json({
        success: true,
        message: 'Login successful',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = AuthController;
