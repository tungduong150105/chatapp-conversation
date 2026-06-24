import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import { fileURLToPath } from 'url';
import path from 'path';
import { env } from '@/config/env';
import { logger } from '@/utils/logger';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Works for both dev (src/grpc/) and prod (dist/grpc/): go up 4 levels to repo root
const PROTO_PATH = path.resolve(__dirname, '../../../../proto/user.proto');

const packageDef = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const grpcObject = grpc.loadPackageDefinition(packageDef) as unknown as {
  user: { UserService: grpc.ServiceClientConstructor };
};

// Lazy singleton — created on first use
let _client: grpc.Client | null = null;

const getClient = (): grpc.Client => {
  if (!_client) {
    _client = new grpcObject.user.UserService(
      env.USER_SERVICE_GRPC_URL,
      grpc.credentials.createInsecure(),
    );
  }
  return _client;
};

export interface GrpcUser {
  id: string;
  email: string;
  display_name: string;
  created_at: string;
  updated_at: string;
}

export const getUsersByIds = (ids: string[]): Promise<GrpcUser[]> => {
  return new Promise((resolve, reject) => {
    const client = getClient() as grpc.Client & {
      GetUsersByIds: (
        req: { ids: string[] },
        cb: (err: grpc.ServiceError | null, res: { users: GrpcUser[] }) => void,
      ) => void;
    };

    client.GetUsersByIds({ ids }, (err, res) => {
      if (err) {
        logger.error({ err, ids }, 'gRPC GetUsersByIds failed');
        reject(err);
        return;
      }
      resolve(res.users);
    });
  });
};

export const getUserById = (id: string): Promise<GrpcUser> => {
  return new Promise((resolve, reject) => {
    const client = getClient() as grpc.Client & {
      GetUser: (
        req: { id: string },
        cb: (err: grpc.ServiceError | null, res: GrpcUser) => void,
      ) => void;
    };

    client.GetUser({ id }, (err, res) => {
      if (err) {
        logger.error({ err, id }, 'gRPC GetUser failed');
        reject(err);
        return;
      }
      resolve(res);
    });
  });
};

export const closeUserClient = (): void => {
  if (_client) {
    _client.close();
    _client = null;
  }
};
