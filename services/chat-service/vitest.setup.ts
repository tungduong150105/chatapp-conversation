process.env.NODE_ENV = 'test';
process.env.CHAT_SERVICE_PORT = '4000';
process.env.MONGO_URL = 'mongodb://127.0.0.1:27017/chatapp_test';
process.env.REDIS_URL = 'redis://127.0.0.1:6379';
process.env.INTERNAL_API_TOKEN = 'supersecret_internal_token_12345';
process.env.JWT_SECRET = 'test_jwt_secret_at_least_32_chars_long';
process.env.ENABLE_EVENT_PUBLISH = 'false';
