import 'dotenv/config';
import * as Joi from 'joi';

interface EnvironmentsVariables {
  NODE_ENV: 'development' | 'production' | 'test' | 'provision';
  DATABASE_PORT: number;
  DATABASE_HOST: string;
  DATABASE_USER: string;
  DATABASE_PASSWORD: string;
  DATABASE_NAME: string;
  DEBUG: boolean;
  ALLOWED_HOSTS: string;
  SECRET_KEY: string;
  KAFKA_BROKER_URL: string;
  KAFKA_TOPIC: string;
  READINGS_KAFKA_CLIENT_ID: string;
  READINGS_KAFKA_GROUP_ID: string;
  READINGS_KAFKA_CLIENT: string;
  KAFKA_BROKER_INTERNAL: string;
  KAFKA_BROKER_EXTERNAL: string;
  OBSERVATION_KAFKA_GROUP_ID: string;
  OBSERVATION_KAFKA_CLIENT: string;
  OBSERVATION_KAFKA_CLIENT_ID: string;
  PHOTO_READING_KAFKA_GROUP_ID: string;
  PHOTO_READING_KAFKA_CLIENT: string;
  PHOTO_READING_KAFKA_CLIENT_ID: string;
  LOCATION_CONNECTION_KAFKA_CLIENT: string;
  LOCATION_CONNECTION_KAFKA_CLIENT_ID: string;
  LOCATION_CONNECTION_KAFKA_GROUP_ID: string;
}

const environmentsSchema = Joi.object<EnvironmentsVariables>({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test', 'provision')
    .required(),
  DATABASE_PORT: Joi.number().default(5432),
  DATABASE_HOST: Joi.string().required(),
  DATABASE_USER: Joi.string().required(),
  DATABASE_PASSWORD: Joi.string().required(),
  DATABASE_NAME: Joi.string().required(),
  DEBUG: Joi.boolean().default(false),
  ALLOWED_HOSTS: Joi.string().required(),
  SECRET_KEY: Joi.string().required(),
  KAFKA_BROKER_URL: Joi.string().required(),
  KAFKA_TOPIC: Joi.string().required(),
  READINGS_KAFKA_CLIENT_ID: Joi.string().required(),
  READINGS_KAFKA_GROUP_ID: Joi.string().required(),
  READINGS_KAFKA_CLIENT: Joi.string().required(),
  KAFKA_BROKER_INTERNAL: Joi.string().required(),
  KAFKA_BROKER_EXTERNAL: Joi.string().required(),
  OBSERVATION_KAFKA_GROUP_ID: Joi.string().required(),
  OBSERVATION_KAFKA_CLIENT: Joi.string().required(),
  OBSERVATION_KAFKA_CLIENT_ID: Joi.string().required(),
  PHOTO_READING_KAFKA_GROUP_ID: Joi.string().required(),
  PHOTO_READING_KAFKA_CLIENT: Joi.string().required(),
  PHOTO_READING_KAFKA_CLIENT_ID: Joi.string().required(),
  LOCATION_CONNECTION_KAFKA_CLIENT: Joi.string().required(),
  LOCATION_CONNECTION_KAFKA_CLIENT_ID: Joi.string().required(),
  LOCATION_CONNECTION_KAFKA_GROUP_ID: Joi.string().required(),
}).unknown(true);

const { error, value: envVars } = environmentsSchema.validate(process.env);

if (error) {
  throw new Error(`Config validation error: ${error.message}`);
}

export const environments: EnvironmentsVariables = {
  NODE_ENV: envVars.NODE_ENV,
  DATABASE_PORT: Number(envVars.DATABASE_PORT),
  DATABASE_HOST: envVars.DATABASE_HOST,
  DATABASE_USER: envVars.DATABASE_USER,
  DATABASE_PASSWORD: envVars.DATABASE_PASSWORD,
  DATABASE_NAME: envVars.DATABASE_NAME,
  DEBUG: envVars.DEBUG === true,
  ALLOWED_HOSTS: envVars.ALLOWED_HOSTS,
  SECRET_KEY: envVars.SECRET_KEY,
  KAFKA_BROKER_URL: envVars.KAFKA_BROKER_INTERNAL || envVars.KAFKA_BROKER_EXTERNAL,
  KAFKA_TOPIC: envVars.KAFKA_TOPIC,
  READINGS_KAFKA_CLIENT_ID: envVars.READINGS_KAFKA_CLIENT_ID,
  READINGS_KAFKA_GROUP_ID: envVars.READINGS_KAFKA_GROUP_ID,
  READINGS_KAFKA_CLIENT: envVars.READINGS_KAFKA_CLIENT,
  KAFKA_BROKER_EXTERNAL: envVars.KAFKA_BROKER_EXTERNAL,
  KAFKA_BROKER_INTERNAL: envVars.KAFKA_BROKER_INTERNAL,
  OBSERVATION_KAFKA_GROUP_ID: envVars.OBSERVATION_KAFKA_GROUP_ID,
  OBSERVATION_KAFKA_CLIENT: envVars.OBSERVATION_KAFKA_CLIENT,
  OBSERVATION_KAFKA_CLIENT_ID: envVars.OBSERVATION_KAFKA_CLIENT_ID,
  PHOTO_READING_KAFKA_GROUP_ID: envVars.PHOTO_READING_KAFKA_GROUP_ID,
  PHOTO_READING_KAFKA_CLIENT: envVars.PHOTO_READING_KAFKA_CLIENT,
  PHOTO_READING_KAFKA_CLIENT_ID: envVars.PHOTO_READING_KAFKA_CLIENT_ID,
  LOCATION_CONNECTION_KAFKA_CLIENT: envVars.LOCATION_CONNECTION_KAFKA_CLIENT,
  LOCATION_CONNECTION_KAFKA_CLIENT_ID: envVars.LOCATION_CONNECTION_KAFKA_CLIENT_ID,
  LOCATION_CONNECTION_KAFKA_GROUP_ID: envVars.LOCATION_CONNECTION_KAFKA_GROUP_ID,
};
