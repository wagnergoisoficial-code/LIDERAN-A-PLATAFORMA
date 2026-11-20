const swaggerJsDoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Youth Church Portal API',
      version: '1.0.0',
      description:
        'Production-ready SaaS backend for Youth Church Portal',
      contact: {
        name: 'Youth Church Portal Team',
      },
    },
    servers: [
      {
        url: 'http://localhost:3000/api',
        description: 'Development server',
      },
      {
        url: 'https://api.youthchurch.com/api',
        description: 'Production server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
  },
  apis: ['./src/routes/*.js', './src/modules/**/controllers/*.js'],
};

const swaggerSpec = swaggerJsDoc(options);
module.exports = swaggerSpec;
