import winston from "winston";

export const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf(({ timestamp, level, message, ...data }) => {
            return `[${timestamp}] [${level.toUpperCase()}] ${message} ${
                Object.keys(data).length ? JSON.stringify(data) : ''
            }`;
        })
    ),
    transports: [
        new winston.transports.Console(),      
        new winston.transports.File({ filename: 'logs/error.log', level: 'error' }), 
        new winston.transports.File({ filename: 'logs/app.log' }) 
    ]
});
