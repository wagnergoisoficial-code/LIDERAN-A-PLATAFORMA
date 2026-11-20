const jwt = require('jsonwebtoken');
const config = require('../../config/environment');

// JWT utilities
class JwtUtil {
  static sign(payload) {
    return jwt.sign(payload, config.jwt.secret, {
      expiresIn: config.jwt.expiration,
    });
  }

  static verify(token) {
    return jwt.verify(token, config.jwt.secret);
  }

  static decode(token) {
    return jwt.decode(token);
  }
}

module.exports = JwtUtil;
