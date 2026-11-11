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
        synchronize: false, // le schéma est géré uniquement par les migrations
        poolSize: 10,
        // pg ferme par défaut les connexions inactives après 10 s : avec une base distante, chaque
        // reconnexion (TCP + TLS + authentification) coûte plusieurs allers-retours, donc on les garde ouvertes plus longtemps.
        extra: { idleTimeoutMillis: 300_000, connectionTimeoutMillis: 20_000, keepAlive: true },
        // Journalise toute requête plus lente que 300 ms : montre ce qui est lent si le problème revient
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
