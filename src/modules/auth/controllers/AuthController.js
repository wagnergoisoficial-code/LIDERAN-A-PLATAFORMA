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
        message: 'Conta criada com sucesso',
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
      const result = await this.authService.registerMember(dto, req.user);

      res.status(201).json({
        success: true,
        message: result.pendingAuthorization
          ? 'Membro cadastrado. A conta fica ativa depois da autorização do responsável.'
          : 'Membro cadastrado com sucesso',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async me(req, res, next) {
    try {
      const result = await this.authService.me(req.user.id);

      res.status(200).json({
        success: true,
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
        message: 'Login realizado com sucesso',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = AuthController;
