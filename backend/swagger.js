import swaggerAutogen from 'swagger-autogen';

const doc = {
  info: { title: 'Market API', description: 'Auto-generated documentation' },
  host: '127.0.0.1:3000'
};

const outputFile = './swagger-out.json';
const routes = ['./index.js']; 

swaggerAutogen()(outputFile, routes);
