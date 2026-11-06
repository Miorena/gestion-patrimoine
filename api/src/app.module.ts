import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AssetsModule } from './assets/assets.module';
import { AuthModule } from './auth/auth.module';
import { LookupsModule } from './lookups/lookups.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres' as const,
        url: config.getOrThrow<string>('DATABASE_URL'),
        autoLoadEntities: true,
        synchronize: false, // the schema is managed by migrations only
        poolSize: 10,
        // pg closes idle connections after 10 s by default: with a remote database every
        // reconnection (TCP + TLS + auth) costs several round trips, so keep them open longer.
        extra: { idleTimeoutMillis: 300_000, connectionTimeoutMillis: 20_000, keepAlive: true },
        // Logs any query slower than 300 ms: shows what is slow if the problem comes back
        maxQueryExecutionTime: 300,
      }),
    }),
    UsersModule,
    AuthModule,
    LookupsModule,
    AssetsModule,
  ],
})
export class AppModule {}
